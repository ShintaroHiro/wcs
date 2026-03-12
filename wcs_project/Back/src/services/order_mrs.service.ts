/**
 * NOTE — Goals of this refactor
 * - Keep public API and overall flow identical
 * - Remove duplication (repos, tx boilerplate, tiny cast helpers)
 * - Tighten idempotency & event logging (unchanged behavior)
 * - Keep structure and naming stable for minimal surface change
 */
import { EntityManager, Repository } from "typeorm";
import { AppDataSource } from "../config/app-data-source";
import { ApiResponse } from "../models/api-response.model";
import { MRS } from "../entities/mrs.entity";
import { Aisle } from "../entities/aisle.entity";
import { MrsLog } from "../entities/mrs_log.entity";
import {
    StatusOrders,
    AisleStatus,
    ControlSource,
    TaskSource,
    TaskSubsystem,
    StatusMRS,
} from "../common/global.enum";
import * as lang from "../utils/LangHelper";
import { MrsGateway } from "../gateways/mrs.gateway";
import { OrdersLog } from "../entities/orders_log.entity";
import { Orders } from "../entities/orders.entity";
import { StockItems } from "../entities/m_stock_items.entity";
import { MRS_AISLE } from "../entities/mrs_aisle.entity";
import { Locations } from "../entities/m_location.entity";
import { LocationsMrs } from "../entities/m_location_mrs.entity";

/**
 * NOTE — Goals of this refactor (modified for FAT Task Status Response)
 * - Keep public API and overall flow identical
 * - Align MRS task status transitions with FAT: 
 *   PENDING > QUEUE→ OPENING_AISLE → AISLE_OPEN → WAITING_FINISH → CLOSING_AISLE → COMPLETED/FAILED
 */
export class T1MOrdersService {
    // NOTE: เวลาอยู่ใน transaction ให้ใช้ useManager.getRepository(...) เท่านั้น
    private readonly sessionIdleMs = 60_000; // ต่ออายุ session 60s ทุกครั้งที่มี activity

    // รับ gateway ผ่าน constructor
    constructor(private gw: MrsGateway) {}

    /** Centralized repo getter per EntityManager */
    private repos(em: EntityManager) {
        return {
            mrsRepo: em.getRepository(MRS),
            aisleRepo: em.getRepository(Aisle),
            mrslogRepo: em.getRepository(MrsLog),
            ordersRepo: em.getRepository(Orders),
            taskLogRepo: em.getRepository(OrdersLog),
            stockItemsRepo: em.getRepository(StockItems),
            locationRepo: em.getRepository(Locations),
            locationMrsRepo: em.getRepository(LocationsMrs),
            mrsAisleRepo: em.getRepository(MRS_AISLE)

        } as const;
    }

    private async beginTx(manager?: EntityManager) {
        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager || queryRunner?.manager;
        if (!useManager)
            throw new Error(lang.msg("validation.no_entityManager_or_queryRunner_available"));

        if (!manager && queryRunner) {
            await queryRunner.connect();
            await queryRunner.startTransaction();
        }

        const r = this.repos(useManager);
        return {
            useManager,
            queryRunner,
            ...r,
            commit: async () => {
                if (!manager && queryRunner) await queryRunner.commitTransaction();
            },
            rollback: async () => {
                if (!manager && queryRunner) await queryRunner.rollbackTransaction();
            },
            release: async () => {
                if (!manager) await queryRunner?.release();
            },
        } as const;
    }

    // ======= บันทึก log ของ order =======
    public async logTaskEvent(
        manager: EntityManager,
        order: Orders,
        params?: {
            actor?: string | null;
            source?: TaskSource | string | null;
            message?: any;
            status?: StatusOrders | string | null;
        }
    ): Promise<void> {

        const repo = manager.getRepository(OrdersLog);

        // โหลดข้อมูลสินค้า (ไม่ throw)
        const stockRepo = manager.getRepository(StockItems);
        const stock = await stockRepo.findOne({
            where: { item_id: order.item_id }
        });

        const itemId = stock?.item_id ?? null;
        const itemStock = stock?.stock_item ?? null;
        const itemDesc = stock?.item_desc ?? null;

        // โหลด location (ไม่ throw)
        const locRepo = manager.getRepository(Locations);
        const loc = await locRepo.findOne({
            where: { loc_id: order.loc_id }
        });

        const locId = loc?.loc_id ?? null;
        const location = loc?.loc ?? null;
        const boxLocation = loc?.box_loc ?? null;

        // Default ค่า metadata
        const resolvedSource: TaskSource =
            (params?.source as TaskSource) ?? TaskSource.SYSTEM;

        const resolvedActor: string | null =
            params?.actor ??
            (resolvedSource === TaskSource.API ? null : String(resolvedSource));

        await repo.insert({
            order_id: order.order_id,
            type: order.type as any,

            // Stock info (nullable)
            item_id: itemId,
            stock_item: itemStock,
            item_desc: itemDesc,

            // Location info (nullable)
            loc_id: locId,
            loc: location,
            box_loc: boxLocation,

            cond: order.cond ?? null,
            plan_qty: order.plan_qty ?? 0,
            actual_qty: order.actual_qty ?? 0,

            status: (params?.status as any) ?? null,
            is_confirm: order.is_confirm ?? false,

            actor: resolvedActor,
            source: resolvedSource,
            message: params?.message ?? null,
        });
    }

    private extendSession(device: MRS) {
        (device as any).open_session_expires_at = new Date(Date.now() + this.sessionIdleMs);
    }

    //บันทึก mrs และ mrslog
    private async prepareMRSForMoving(
        mrsRepo: Repository<MRS>,
        mrslogRepo: Repository<MrsLog>,
        device: MRS,
        order: Orders,
        targetAisleId: number
    ) {
        // 1) Update MRS → MOVING
        await mrsRepo.update(
            { mrs_id: device.mrs_id },
            {
                mrs_status: StatusMRS.MOVING,
                target_aisle_id: targetAisleId,
                is_available: false,
                last_update: new Date(),
                current_order_id: order.order_id,
                current_aisle_id: targetAisleId
            }
        );

        // 2) Insert MRS Log → MOVING
        const movingLog = mrslogRepo.create({
            mrs_id: device.mrs_id,
            aisle_id: targetAisleId,
            order_id: order.order_id,
            status: StatusMRS.MOVING,
            operator: ControlSource.AUTO,
            start_time: new Date()
        });
        await mrslogRepo.save(movingLog);

        return movingLog;
    }

    // -------------------------
    // ฟังก์ชันกลาง (private)
    // -------------------------

    private async getRoutingContext(
        order_id: number,
        em: EntityManager
    ) {
        const {
            ordersRepo,
            locationRepo,
            locationMrsRepo,
            mrsRepo,
            mrsAisleRepo,
            aisleRepo
        } = this.repos(em);

        // 1) หา order
        const order = await ordersRepo.findOne({ where: { order_id } });
        if (!order) throw new Error("Order not found");

        // 2) หา location
        const location = await locationRepo.findOne({
            where: { loc_id: order.loc_id }
        });
        if (!location) throw new Error("Location not found");

        // 3) หา mapping location → MRS
        const locationMrs = await locationMrsRepo.findOne({
            where: { loc_id: location.loc_id }
        });
        if (!locationMrs) {
            throw new Error("Location is not mapped to any MRS");
        }

        // 4) หา MRS
        const mrs = await mrsRepo.findOne({
            where: { mrs_id: locationMrs.mrs_id }
        });
        if (!mrs) throw new Error("MRS not found");

        const mrsBank = mrs.bank_code;
        if (!mrsBank) throw new Error("MRS missing bank_code");

        // 5) หา Aisle ที่แมปกับ MRS นี้
        const mrsAisle = await mrsAisleRepo.findOne({
            where: { mrs_id: mrs.mrs_id }
        });
        if (!mrsAisle) throw new Error("Aisle mapping not found for this MRS");

        // 6) หา Aisle
        const aisle = await aisleRepo.findOne({
            where: { aisle_id: mrsAisle.aisle_id }
        });
        if (!aisle) throw new Error("Aisle not found");

        const aisleBank = aisle.bank_code;
        if (!aisleBank) throw new Error("Aisle missing bank_code");

        // 7) validate bank_code
        if (mrsBank !== aisleBank) {
            throw new Error(
                `bank_code mismatch: MRS(${mrsBank}) ≠ Aisle(${aisleBank})`
            );
        }

        return {
            order,
            location,
            mrs,
            aisle,
            bank_code: mrsBank
        };
    }

    private async isBankBusy(
        mrsRepo: Repository<MRS>, 
        bankCode: string
    ) {
        // ดึงข้อมูล MRS ทั้งหมดใน bank ที่ต้องการ พร้อม lock
        const bankRows = await mrsRepo
            .createQueryBuilder("m")
            .setLock("pessimistic_write")
            .where("m.bank_code = :bank", { bank: bankCode })
            .getMany();

        // เช็คว่า **มีตัวไหนไม่พร้อมใช้งานหรือไม่**
        const busy = bankRows.some(r =>
            !(
                r.mrs_status === 'IDLE' &&
                r.is_available === true &&
                r.e_stop === false &&
                r.is_aisle_open === false
            )
        );

        return busy; // true = busy, false = idle พร้อมทำงาน
    }


    private async queueOrderForBankBusy(
        ordersRepo: Repository<Orders>,
        logTaskEvent: (manager: EntityManager, order: Orders, payload: any) => Promise<void>,
        order: Orders,
        actor: string
    ) {
        await ordersRepo.update(
            { order_id: order.order_id },
            { status: StatusOrders.QUEUE, queued_at: new Date() }
        );

        // log task event
        await logTaskEvent(ordersRepo.manager, order, {
            actor,
            status: StatusOrders.QUEUE
        });
    }


    // -------------------------
    // ฟังก์ชันหลัก executionInbT1m
    // -------------------------
    async executionInbT1m(
        order_id: number,
        reqUsername: string,
        manager?: EntityManager
    ): Promise<ApiResponse<any>> {

        const operation = "T1MOrdersService.executionInbT1m";
        const response = new ApiResponse<any>();

        // beginTx จะตรวจว่า ส่ง manager มาหรือไม่ 
        // ถ้าส่งมา → ไม่สร้าง transaction ใหม่
        const ctx = await this.beginTx(manager);

        try {
            const {
                useManager,
                ordersRepo,
                mrsRepo,
                mrslogRepo,
            } = ctx;

            // -------------------------------------------------------
            // 1) โหลด order
            // -------------------------------------------------------
            const order = await ordersRepo.findOne({ where: { order_id } });
            if (!order) throw new Error("Order not found");

            // -------------------------------------------------------
            // 2) อัปเดต status = PROCESSING
            // -------------------------------------------------------
            await ordersRepo.update(
                { order_id },
                {
                    status: StatusOrders.PROCESSING,
                    started_at: new Date()
                }
            );

            await this.logTaskEvent(useManager, order, {
                actor: reqUsername,
                status: StatusOrders.PROCESSING
            });

            // -------------------------------------------------------
            // 3) Routing
            // -------------------------------------------------------
            const routing = await this.getRoutingContext(order_id, useManager);
            const device = routing.mrs;
            const targetAisle = routing.aisle;
            const bankCode = routing.bank_code;

            if (!device) throw new Error("MRS device not found");
            if (!targetAisle) throw new Error("No aisle available");

            // -------------------------------------------------------
            // 4) ตรวจสอบ bank busy
            // -------------------------------------------------------
            const busy = await this.isBankBusy(mrsRepo, bankCode);

            if (busy) {
                await this.queueOrderForBankBusy(
                    ordersRepo,
                    this.logTaskEvent.bind(this),
                    order,
                    reqUsername
                );

                // IMPORTANT:
                // ถ้าเป็น inner transaction (manager ถูกส่งเข้ามา)
                // → ctx.commit() = NO-OP (ไม่ commit จริง)
                await ctx.commit();

                return response.setComplete("Order queued due to bank busy", {
                    queued: true,
                    order_id
                });
            }

            // -------------------------------------------------------
            // 5) prepare MRS → set MOVING
            // -------------------------------------------------------
            await this.prepareMRSForMoving(
                mrsRepo,
                mrslogRepo,
                device,
                order,
                targetAisle.aisle_id
            );

            // delay เล็กน้อย (จำลองการเตรียม MRS)
            await new Promise((res) => setTimeout(res, 200));

            // -------------------------------------------------------
            // 6) commit database ก่อน — ป้องกัน deadlock
            // -------------------------------------------------------
            await ctx.commit();

            // OUTER transaction (standalone call) → trigger MRS device
            await this.gw.openAisle({
                mrs_id: device.mrs_id,
                aisle_id: targetAisle.aisle_id,
                order_id
            });

            return response.setComplete("executionInbT1m started", { order_id });

        } catch (err: any) {
            await ctx.rollback();
            console.error(operation, err);
            throw new Error(`Error in ${operation}: ${err.message}`);

        } finally {
            await ctx.release();
        }
    }


    // ======= onOpenFinished (แก้ไข) =======
    async onOpenFinished(
        payload: { order_id: number; aisle_id: number; duration_ms?: number },
        manager?: EntityManager
    ): Promise<ApiResponse<any>> {

        const operation = "T1MOrdersService.onOpenFinished";
        let response = new ApiResponse<any>();

        const ctx = await this.beginTx(manager);

    try {

        // ดึง locationRepo ออกมาด้วย
        const { 
            useManager, 
            mrslogRepo, 
            ordersRepo, 
            mrsRepo, 
            aisleRepo, 
            locationRepo,
            locationMrsRepo 
        } = ctx;

        // โหลด order
        const order = await ordersRepo.findOne({ where: { order_id: payload.order_id } });
        if (!order) return response.setIncomplete("Order not found");

        // โหลด location ผ่าน loc_id (ระบบใหม่)
        const loc = await locationRepo.findOne({
            where: { loc_id: order.loc_id }
        });

        let mrsId: number | null = null;

        if (loc) {
            const locationMrs = await locationMrsRepo.findOne({
                where: { loc_id: loc.loc_id }
            });

            mrsId = locationMrs?.mrs_id ?? null;
        }

        const now = new Date();

        // --- Update order status ---
        await ordersRepo.update(
            { order_id: order.order_id },
            {
                status: StatusOrders.AISLE_OPEN,
            }
        );

        await this.logTaskEvent(useManager, order, {
            actor: null,
            status: StatusOrders.AISLE_OPEN,
        });

        // --- Update Aisle status ---
        await aisleRepo.update(
            { aisle_id: payload.aisle_id },
            {
                status: AisleStatus.OPEN as any,
                last_opened_at: now,
                last_event_at: now,
            }
        );

        // --- Create MRS Log ---
        const movingLog = mrslogRepo.create({
            mrs_id: mrsId,
            aisle_id: payload.aisle_id,
            order_id: order.order_id,
            status: StatusMRS.OPENED,
            operator: ControlSource.AUTO,
            start_time: now,
        });

        await mrslogRepo.save(movingLog);

        // --- โหลด device ด้วย mrs_id (ใหม่) ---
        let device = null;
        if (mrsId) {
            device = await mrsRepo.findOne({ where: { mrs_id: mrsId } });
        }

        // --- ต่ออายุ session ถ้ามี device ---
        if (device) {
            device.mrs_status = StatusMRS.OPENED;
            device.is_aisle_open = true;
            device.open_session_aisle_id = payload.aisle_id;
            device.current_aisle_id = payload.aisle_id;
            device.current_order_id = payload.order_id;

            this.extendSession(device);
            await mrsRepo.save(device);
        }

        await ctx.commit();
        return response.setComplete("AISLE_OPEN finished", { order_id: order.order_id });

    } catch (error: any) {
        await ctx.rollback();
        console.error(operation, error);
        throw new Error(`Error in ${operation}: ${error.message}`);
    } finally {
        await ctx.release();
    }
}

}
