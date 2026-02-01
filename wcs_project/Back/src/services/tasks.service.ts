// services/orchestrated-task.service.ts
import { AppDataSource } from "../config/app-data-source";
import { EntityManager, In, QueryFailedError, Repository } from 'typeorm';
import { ApiResponse } from '../models/api-response.model';
import { Orders} from '../entities/orders.entity';
import { AisleStatus, ScanStatus, StatusMRS, StatusOrders, TypeInfm } from '../common/global.enum';
import * as validate from '../utils/ValidationUtils';
import * as lang from '../utils/LangHelper';

import { OrdersLog } from "../entities/orders_log.entity";
import { T1MOrdersService } from "./order_mrs.service";
import { OrdersLogService } from "../utils/logTaskEvent";
import { MRS } from "../entities/mrs.entity";
import { Aisle } from "../entities/aisle.entity";
import { Locations } from "../entities/m_location.entity";
import { InventoryService } from "./inventory.service";
import { LocationsMrs } from "../entities/m_location_mrs.entity";
import { T1OrdersService } from "./order_wrs.service";
import { Counter } from "../entities/counter.entity";
import { WRS } from "../entities/wrs.entity";
import { CounterRuntimeService } from './counter_runtime.service';
import { broadcast } from "./sse.service";
import { s_user } from "../entities/s_user.entity";
import { v4 as uuidv4 } from 'uuid';

const runtimeService = new CounterRuntimeService();

// (ถ้ามี) import { WRSTaskService } from './wrs-task.service';

// services/tasks.service.ts
// tasks.dto.ts
export type CreateTaskItem = {
    order_id?: number;
};

export type CreateTaskBatchDto = {
  items: CreateTaskItem[];     // อาร์เรย์เสมอ (แม้มี 1 รายการ)
};

// services/tasks.service.ts
export class OrchestratedTaskService {
    private ordersRepository: Repository<Orders>;

    constructor(
        private readonly t1mOrders: T1MOrdersService,
        private readonly t1Orders: T1OrdersService, // ✅ ต้องมี
        ) {
        this.ordersRepository = AppDataSource.getRepository(Orders);
    }

    async createAndOpenBatch(
        orderIds: number[],
        userId: number
        ): Promise<ApiResponse<any>> {

        const res = new ApiResponse<any>();

        if (!orderIds?.length) {
            return res.setIncomplete('orderIds[] is required');
        }

        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const manager = queryRunner.manager;
            const userRepo = manager.getRepository(s_user);
            const ordersRepo = manager.getRepository(Orders);

            const executor = await userRepo.findOne({
            where: { user_id: userId }
            });

            if (!executor) {
            throw new Error(`Executor not found: ${userId}`);
            }

            const executionGroupId = uuidv4();
            const resultList: any[] = [];

            /* ================= LOOP หลาย order ================= */
            for (const order_id of orderIds) {

            const order = await ordersRepo.findOne({
                where: { order_id },
                lock: { mode: 'pessimistic_write' }
            });
            if (!order) {
                throw new Error(`Order not found: ${order_id}`);
            }

            const { type, store_type } = order;
            let r: ApiResponse<any> | undefined;

            /* ---------- T1M ---------- */
            if (store_type === 'T1M') {
                if (type === 'USAGE' || type === 'RECEIPT') {
                r = await this.t1mOrders.executionInbT1m(
                    order_id,
                    executor.username,
                    manager
                );
                } else {
                throw new Error(`Unknown T1M type: ${type}`);
                }
            }

            /* ---------- T1 ---------- */
            else if (store_type === 'T1') {
                await ordersRepo.update(
                { order_id },
                {
                    executed_by_user_id: executor.user_id,
                    status: StatusOrders.QUEUE,
                    execution_group_id: executionGroupId
                }
                );

                r = new ApiResponse<any>().setComplete('T1 order queued', {});
            }

            else {
                throw new Error(`Unknown store_type: ${store_type}`);
            }

            if (!r || !r.isCompleted) {
                throw new Error(r?.message ?? 'Execution failed');
            }

            resultList.push({
                order_id,
                store_type,
                type
            });
            }

            // 🔥 trigger scheduler ครั้งเดียว
            await this.callNextQueueT1(queryRunner.manager);

            await queryRunner.commitTransaction();

            return res.setComplete(
            'Confirm to Execution successfully',
            { items: resultList }
            );

        } catch (e: any) {

            if (queryRunner.isTransactionActive) {
            await queryRunner.rollbackTransaction();
            }

            return res.setError(
            `createAndOpenBatch failed: ${e.message}`,
            'createAndOpenBatch',
            e,
            String(userId),
            true
            );

        } finally {
            await queryRunner.release();
        }
    }


    /* เปลี่ยนจาก execution to waiting */
    async changeToWaitingBatch(
        dto: { items: { order_id: number }[] },
        reqUsername: string,
        manager?: EntityManager
    ): Promise<ApiResponse<any>> {

        const response = new ApiResponse<any>();
        const operation = "OrchestratedTaskService.changeToWaitingBatch";

        if (!dto?.items?.length) {
            return response.setIncomplete("items[] is required");
        }

        // เตรียม QueryRunner ถ้าไม่มี manager ส่งเข้ามา
        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager || queryRunner?.manager;

        if (!useManager) {
            return response.setIncomplete(
                lang.msg("validation.no_entityManager_or_queryRunner_available")
            );
        }

        if (!manager && queryRunner) {
            await queryRunner.connect();
            await queryRunner.startTransaction();
        }

        try {
            const ordersRepo = useManager.getRepository(Orders);
            const logService = new OrdersLogService();

            const updated: number[] = [];

            // -----------------------------
            // 🔥 Loop item แบบ Strict
            // ถ้ามี error → throw → rollback ทั้งหมด
            // -----------------------------
            for (const item of dto.items) {
                const orderId = item.order_id;

                // 1) โหลด order
                const order = await ordersRepo.findOne({
                    where: { order_id: orderId },
                });

                if (!order) {
                    throw new Error(`Order not found: ${orderId}`);
                }

                // 2) ต้องเป็น PENDING
                if (order.status !== StatusOrders.PENDING) {
                    throw new Error(
                        `${orderId}: Only PENDING status can be changed`
                    );
                }

                // 3) อัปเดต → WAITING
                await ordersRepo.update(
                    { order_id: orderId },
                    {
                        status: StatusOrders.WAITING,
                        execution_group_id: () => "NULL",
                        started_at: () => "NULL",
                        queued_at: () => "NULL",
                    }
                );

                // 4) Log event
                await logService.logTaskEvent(useManager, order, {
                    actor: reqUsername,
                    status: StatusOrders.WAITING,
                });

                updated.push(orderId);
            }

            // 5️⃣ Commit
            if (!manager && queryRunner) {
                await queryRunner.commitTransaction();
            }

            return response.setComplete("changeToWaiting batch completed", {
                updated,
            });

        } catch (error: any) {
            if (!manager && queryRunner) {
                await queryRunner.rollbackTransaction();
            }

            console.error(`Error during ${operation}:`, error);

            if (error instanceof QueryFailedError) {
                return response.setIncomplete(
                    lang.msgErrorFunction(operation, error.message)
                );
            }

            return response.setIncomplete(error.message);
        } finally {
            if (!manager && queryRunner) {
                await queryRunner.release();
            }
        }
    }

    /* เปลี่ยนสถานะจาก waiting → PENDING แต่ยังไม่ทำ execution */
    async changeToPendingBatch(
        dto: { items: { order_id: number }[] },
        reqUsername: string,
        manager?: EntityManager
    ): Promise<ApiResponse<any>> {

        const response = new ApiResponse<any>();
        const operation = "OrchestratedTaskService.changeToPendingBatch";

        if (!dto?.items?.length) {
            return response.setIncomplete("items[] is required");
        }

        // เตรียม QueryRunner ถ้าไม่มี manager
        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager || queryRunner?.manager;

        if (!useManager) {
            return response.setIncomplete(
                lang.msg("validation.no_entityManager_or_queryRunner_available")
            );
        }

        if (!manager && queryRunner) {
            await queryRunner.connect();
            await queryRunner.startTransaction();
        }

        try {
            const ordersRepo = useManager.getRepository(Orders);
            const logService = new OrdersLogService();

            const updated: number[] = [];

            // -----------------------------
            // 🔥 Strict loop
            // error ตัวเดียว → rollback ทั้ง batch
            // -----------------------------
            for (const item of dto.items) {
                const orderId = item.order_id;

                // 1) โหลด order
                const order = await ordersRepo.findOne({
                    where: { order_id: orderId },
                });

                if (!order) {
                    throw new Error(`Order not found: ${orderId}`);
                }

                // 2) ต้องเป็น WAITING เท่านั้น
                if (order.status !== StatusOrders.WAITING) {
                    throw new Error(
                        `${orderId}: Only WAITING status can be changed`
                    );
                }

                // 3) อัปเดต → PENDING
                await ordersRepo.update(
                    { order_id: orderId },
                    {
                        status: StatusOrders.PENDING,
                    }
                );

                // 4) Log event
                await logService.logTaskEvent(useManager, order, {
                    actor: reqUsername,
                    status: StatusOrders.PENDING,
                });

                updated.push(orderId);
            }

            // 5️⃣ Commit
            if (!manager && queryRunner) {
                await queryRunner.commitTransaction();
            }

            return response.setComplete("changeToExecution batch completed", {
                updated,
            });

        } catch (error: any) {
            if (!manager && queryRunner) {
                await queryRunner.rollbackTransaction();
            }

            console.error(`Error during ${operation}:`, error);

            if (error instanceof QueryFailedError) {
                return response.setIncomplete(
                    lang.msgErrorFunction(operation, error.message)
                );
            }

            return response.setIncomplete(error.message);
        } finally {
            if (!manager && queryRunner) {
                await queryRunner.release();
            }
        }
    }

    /** Ready to handle item for MRS*/
    async handleOrderItemMrs(
        order_id: number,
        actual_qty: number,
        reqUsername: string,
        manager?: EntityManager
    ): Promise<ApiResponse<any>> {
        const response = new ApiResponse<any>();
        const operation = 'OrchestratedTaskService.handleOrderItemMrs';

        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager || queryRunner?.manager;

        if (!useManager) {
            return response.setIncomplete('No EntityManager or QueryRunner available');
        }

        if (!manager && queryRunner) {
            await queryRunner.connect();
            await queryRunner.startTransaction();
        }

        try {
            const ordersRepo = useManager.getRepository(Orders);
            const mrsRepo = useManager.getRepository(MRS);
            const aisleRepo = useManager.getRepository(Aisle);
            const locationRepo = useManager.getRepository(Locations);
            const locationMrsRepo = useManager.getRepository(LocationsMrs);

            //-----------------------------------
            // 1) โหลด order
            //-----------------------------------
            const order = await ordersRepo.findOne({ where: { order_id } });
            if (!order) {
                return response.setIncomplete(`Order not found: ${order_id}`);
            }

            // ตรวจสอบ status ต้องเป็น AISLE_OPEN เท่านั้น
            if (order.status !== StatusOrders.AISLE_OPEN) {
                return response.setIncomplete('Only AISLE_OPEN status can be changed');
            }

            // ตรวจสอบ plan_qty
            if (order.plan_qty === undefined) {
                return response.setIncomplete(`Planned quantity is not set for order ${order_id}`);
            }

            if (actual_qty > order.plan_qty) {
                return response.setIncomplete(
                    `Actual quantity (${actual_qty}) exceeds planned quantity (${order.plan_qty})`
                );
            }

            //-----------------------------------
            // 2) UPDATE ORDER ถ้ายิงครบ=completed ถ้ายิงไม่ครบ=finished
            //-----------------------------------
            const isCompleted = actual_qty === order.plan_qty;

            order.actual_qty = actual_qty;
            order.actual_by = reqUsername;
            order.finished_at = new Date();
            order.status = isCompleted
                ? StatusOrders.COMPLETED
                : StatusOrders.FINISHED;
            order.is_confirm = true;

            order.actual_status = isCompleted
                ? ScanStatus.COMPLETED
                : ScanStatus.PARTIAL;

            await ordersRepo.save(order);

            // Log
            const logService = new OrdersLogService();
            await logService.logTaskEvent(useManager, order, {
                actor: reqUsername,
                status: order.status
            });

            //-----------------------------------
            // 2.1) UPDATE INVENTORY
            //-----------------------------------
            const invService = new InventoryService();

            switch (order.type) {
                case TypeInfm.RECEIPT:
                    await invService.receipt(useManager, order);
                    break;

                case TypeInfm.USAGE:
                    await invService.usage(useManager, order);
                    break;

                case TypeInfm.TRANSFER:
                    await invService.transfer(useManager, order);
                    break;

                default:
                    throw new Error(`Unsupported order type: ${order.type}`);
            }

            //-----------------------------------
            // 3) หา MRS จาก loc_id (ผ่าน m_location_mrs)
            //-----------------------------------
            const location = await locationRepo.findOne({
                where: { loc_id: order.loc_id }
            });

            if (!location) {
                throw new Error(`Location not found for loc_id ${order.loc_id}`);
            }

            let mrs: MRS | null = null;

            const locationMrs = await locationMrsRepo.findOne({
                where: { loc_id: location.loc_id }
            });

            if (locationMrs) {
                mrs = await mrsRepo.findOne({
                    where: { mrs_id: locationMrs.mrs_id }
                });
            }

            //-----------------------------------
            // 4) UPDATE MRS → reset status
            //-----------------------------------
            if (mrs) {
                await mrsRepo.update(
                    { mrs_id: mrs.mrs_id },
                    {
                        current_order_id: () => 'NULL',
                        target_aisle_id: () => 'NULL',
                        // current_aisle_id: () => 'NULL',
                        is_available: true,
                        is_aisle_open: false,
                        open_session_aisle_id: null,
                        open_session_expires_at: null,
                        mrs_status: StatusMRS.IDLE,
                    }
                );
            }

            //-----------------------------------
            // 5) UPDATE AISLE → close
            //-----------------------------------
            if (mrs && mrs.target_aisle_id) {
                await aisleRepo.update(
                    { aisle_id: mrs.target_aisle_id },
                    {
                        status: AisleStatus.CLOSED,
                        last_opened_at: undefined
                    }
                );
            }

            //-----------------------------------
            // 6) CALL NEXT QUEUE (ใหม่)
            //-----------------------------------
            await this.callNextQueue(Number(order.loc_id), reqUsername, useManager);

            if (!manager && queryRunner) {
                await queryRunner.commitTransaction();
            }

            return response.setComplete('Order handled successfully', {
                order_id: order.order_id,
                plan_qty: order.plan_qty,
                actual_qty: order.actual_qty,
                actual_by: order.actual_by,
                finished_at: order.finished_at,
            });

        } catch (error: any) {
            if (!manager && queryRunner) {
                await queryRunner.rollbackTransaction();
            }

            console.error('Error during handleOrderItemMrs:', error);

            // ⭐ จุดสำคัญ
            return response.setIncomplete(
                error?.message || `Error in ${operation}`
            );
        } finally {
            if (!manager && queryRunner) {
                await queryRunner.release();
            }
        }
    }

    async callNextQueue(loc_id: number, reqUser: string, manager: EntityManager) {
        const ordersRepo = manager.getRepository(Orders);

        // ⭐ เลือกคิวแบบใหม่ → priority desc ก่อน, requested_at asc ต่อ
        const nextOrder = await ordersRepo.findOne({
            where: {
                loc_id: loc_id,
                status: StatusOrders.QUEUE
            },
            order: {
                priority: "DESC",       // ⭐ priority แบบ B
                requested_at: "ASC"
            }
        });

        if (!nextOrder) return;

        // // อัปเดตสถานะเป็น PROCESSING
        // nextOrder.status = StatusOrders.PROCESSING;
        // await ordersRepo.save(nextOrder);

        // เรียก executionInbT1m
        return await this.t1mOrders.executionInbT1m(
            nextOrder.order_id,
            reqUser,
            manager
        );
    }


    //T1
    async handleOrderItemWRS(
        order_id: number,
        actual_qty: number,
        reqUsername: string,
        manager?: EntityManager
    ): Promise<ApiResponse<any>> {

        const response = new ApiResponse<any>();
        const operation = 'OrchestratedTaskService.handleOrderItemWRS';

        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager || queryRunner?.manager;

        if (!useManager) {
            return response.setIncomplete('No EntityManager or QueryRunner available');
        }

        if (!manager && queryRunner) {
            await queryRunner.connect();
            await queryRunner.startTransaction();
        }

        try {
            const ordersRepo = useManager.getRepository(Orders);
            const counterRepo = useManager.getRepository(Counter);
            const wrsRepo = useManager.getRepository(WRS);

            //-----------------------------------
            // 1) LOAD ORDER
            //-----------------------------------
            const order = await ordersRepo.findOne({ where: { order_id } });

            if (!order) {
                return response.setIncomplete(`Order not found: ${order_id}`);
            }

            if (order.store_type !== "T1") {
                return response.setIncomplete('Order is not T1 type');
            }

            // T1 ปกติจะ scan ตอน PROCESSING
            if (order.status !== StatusOrders.PROCESSING) {
                return response.setIncomplete('Only PROCESSING order can be scanned');
            }

            if (order.plan_qty === undefined) {
                return response.setIncomplete(`Plan qty not set for order ${order_id}`);
            }

            if (actual_qty > order.plan_qty) {
                return response.setIncomplete(
                    `Actual quantity (${actual_qty}) exceeds planned quantity (${order.plan_qty})`
                );
            }

            //-----------------------------------
            // 2) UPDATE ORDER
            //-----------------------------------
            const isCompleted = actual_qty === order.plan_qty;

            order.actual_qty = actual_qty;
            order.actual_by = reqUsername;
            order.finished_at = new Date();
            order.is_confirm = true;

            order.status = isCompleted
                ? StatusOrders.COMPLETED
                : StatusOrders.FINISHED;

            order.actual_status = isCompleted
                ? ScanStatus.COMPLETED
                : ScanStatus.PARTIAL;

            await ordersRepo.save(order);

            // log
            const logService = new OrdersLogService();
            await logService.logTaskEvent(useManager, order, {
                actor: reqUsername,
                status: order.status
            });

            //-----------------------------------
            // 3) UPDATE INVENTORY (CRITICAL SECTION)
            //-----------------------------------
            const invService = new InventoryService();

            try {
                switch (order.type) {
                    case TypeInfm.RECEIPT:
                        await invService.receipt(useManager, order);
                        break;

                    case TypeInfm.USAGE:
                        await invService.usage(useManager, order);
                        break;

                    // case TypeInfm.RETURN:
                    //     await invService.return(useManager, order);
                    //     break;

                    case TypeInfm.TRANSFER:
                        await invService.transfer(useManager, order);
                        break;

                    default:
                        throw new Error(`Unsupported order type: ${order.type}`);
                }
            } catch (invError) {
                throw new Error(
                    `Inventory update failed for order ${order.order_id}: ${invError}`
                );
            }

            //-----------------------------------
            // 4) RESET COUNTER + WRS
            //-----------------------------------
            //-----------------------------------
            // 4.1) RESET COUNTER
            //-----------------------------------
            const counter = await counterRepo.findOne({
                where: { current_order_id: order.order_id },
                lock: { mode: "pessimistic_write" }
            });

            if (counter) {

                await counterRepo.update(
                    { counter_id: counter.counter_id },
                    {
                        status: "EMPTY",

                        // 🔥 ต้องใช้ NULL เท่านั้นถึงจะล้างค่าใน DB
                        current_order_id: () => 'NULL',
                        light_color_hex: () => 'NULL',
                        current_wrs_id: () => 'NULL',
                        light_mode: "OFF",
                        last_event_at: new Date()
                    }
                );

                // reset hardware / runtime
                await runtimeService.reset(counter.counter_id);

                // broadcast ให้ frontend
                broadcast((counter.counter_id), {
                    counter_id: counter.counter_id,
                    actualQty: 0
                });
            }

                //-----------------------------------
                // 4.2) RESET WRS
                //-----------------------------------
                const wrs = await wrsRepo.findOne({
                    where: { current_order_id: order.order_id },
                    lock: { mode: "pessimistic_write" }
                });

                if (wrs) {
                    wrs.wrs_status = "IDLE";
                    wrs.is_available = true;
                    wrs.current_order_id = null;
                    wrs.target_counter_id = null;
                    wrs.last_heartbeat = new Date();

                    await wrsRepo.save(wrs);
                }

                //-----------------------------------
                // 5) CALL NEXT QUEUE (ใหม่)
                //-----------------------------------
                await this.callNextQueueT1(useManager);


            if (!manager && queryRunner) {
                await queryRunner.commitTransaction();
            }

            return response.setComplete('T1 order handled successfully', {
                order_id: order.order_id,
                plan_qty: order.plan_qty,
                actual_qty: order.actual_qty,
                finished_at: order.finished_at
            });

        } catch (error: any) {

            if (!manager && queryRunner) {
                await queryRunner.rollbackTransaction();
            }

            console.error('Error during handleOrderItemWRS:', error);

            return response.setIncomplete(
                error?.message || `Error in ${operation}`
            );

        } finally {
            if (!manager && queryRunner) {
                await queryRunner.release();
            }
        }
    }

    async callNextQueueT1(manager: EntityManager) {

        const ordersRepo = manager.getRepository(Orders);
        const counterRepo = manager.getRepository(Counter);

        while (true) {

            /* 1️⃣ หา counter ที่ว่าง */
            const counter = await counterRepo.findOne({
                where: { status: 'EMPTY' },
                order: { last_event_at: 'ASC' },
                lock: { mode: "pessimistic_write" }
            });

            if (!counter) {
            break; // ❌ ไม่มี counter ว่าง → จบ loop
            }

            /* 2️⃣ หา order ถัดไป */
            const nextOrder = await ordersRepo.findOne({
                where: { store_type: 'T1', status: StatusOrders.QUEUE },
                order: { priority: 'DESC', requested_at: 'ASC' },
                lock: { mode: "pessimistic_write" }
            });

            if (!nextOrder) {
            break; // ❌ ไม่มี order → จบ loop
            }

            /* 3️⃣ Execute */
            const result = await this.t1Orders.executeT1Order(
            nextOrder.order_id,
            manager
            );

            // 🔥 logic หยุด / ไปต่อ
            if (result === 'NO_COUNTER') break;
            if (result === 'NO_AMR') break;
            // ⚠️ อย่า return → ให้ loop ต่อ

            if (result === 'SKIPPED') {
                continue; // ข้าม order นี้ ไปดูตัวถัดไป
            }
        }
    }



    // ------------------------------
    // get all execution
    // ------------------------------
    async getAll(manager?: EntityManager): Promise<ApiResponse<any | null>> {
        const response = new ApiResponse<any | null>();
        const operation = 'OrchestratedTaskService.getAll';

        try {
            const repository = manager ? manager.getRepository(Orders) : this.ordersRepository;

            // Query order ข้อมูลทั้งหมดในรูปแบบ raw data
            const rawData = await repository.createQueryBuilder('order')
                .leftJoin('m_stock_items', 'stock', 'stock.item_id = order.item_id')
                .leftJoin('m_location', 'loc', 'loc.loc_id = order.loc_id')
                .select([
                    'order.order_id AS order_id',
                    'order.type AS type',
                    'stock.item_id AS item_id',
                    'stock.stock_item As stock_item',
                    'stock.item_desc AS item_desc',
                    'loc.loc_id AS loc_id',
                    'loc.loc AS loc',
                    'loc.box_loc AS box_loc',
                    'order.cond AS cond',
                    'order.status AS status',
                    "DATE_FORMAT(order.requested_at, '%d/%m/%Y') AS requested_at",
                    "order.plan_qty AS plan_qty",
                    "order.actual_qty AS actual_qty",
                    "order.store_type AS store_type"
                ])
                //.where('order.status = :status', { status: 'PENDING' }) // ถ้าตรงข้าม ให้ใช้ <>
                .orderBy('order.requested_at', 'ASC') // ✅ เรียงจากเก่ามาใหม่
                .cache(false) // ✅ ปิด Query Cache
                .getRawMany();

            // หากไม่พบข้อมูล
            if (!rawData || rawData.length === 0) {
                return response.setIncomplete(lang.msgNotFound('item.execution'));
            }

            // ส่งข้อมูลกลับในรูปแบบ response
            return response.setComplete(lang.msgFound('item.execution'), rawData);
        } catch (error: any) {
            console.error('Error in getAll:', error);

            if (error instanceof QueryFailedError) {
                return response.setIncomplete(lang.msgErrorFunction(operation, error.message));
            }

            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }
}
