// services/orchestrated-task.service.ts
import { AppDataSource } from "../config/app-data-source";
import { EntityManager, In, QueryFailedError, Repository } from 'typeorm';
import { ApiResponse } from '../models/api-response.model';
import { Orders} from '../entities/orders.entity';
import { AisleStatus, ControlSource, ScanStatus, StatusMRS, StatusOrders, TypeInfm } from '../common/global.enum';
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
import { OrdersTransfer } from "../entities/order_transfer.entity";
import { Events } from "../entities/s_events.entity";
import { EventService } from "../utils/EventService";
import { WrsLogService } from "../utils/LogWrsService";
import { StockItems } from "../entities/m_stock_items.entity";

const runtimeService = new CounterRuntimeService();
const eventService = new EventService();
const ordersLogService = new OrdersLogService();
const inventoryService = new InventoryService();
const wrsLogService = new WrsLogService();

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

            // ✅ ใช้ flag
            let hasT1 = false;
            let hasT1M = false;

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

            /* ---------- T1 ---------- */
            if (store_type === 'T1') {
                hasT1 = true; // ✅ mark
                
                await ordersRepo.update(
                { order_id },
                {
                    executed_by_user_id: executor.user_id,
                    status: StatusOrders.QUEUE,
                    execution_group_id: executionGroupId,
                    queued_at: new Date()
                }
                );

                r = new ApiResponse<any>().setComplete('T1 order queued', {});
            }

            /* ---------- T1M ---------- */
            else if (store_type === 'T1M') {
                hasT1M = true; // ✅ mark

                await ordersRepo.update(
                    { order_id },
                    {
                        executed_by_user_id: executor.user_id,
                        status: StatusOrders.QUEUE,
                        execution_group_id: executionGroupId,
                        queued_at: new Date()
                    }
                );

                r = new ApiResponse<any>().setComplete('T1M order queued', {});
            }

            /* ---------- AGMB ---------- */
            else if (store_type === 'AGMB') {

                r = await this.changeToProcessingBatch(
                    {
                        items: [{ order_id }]
                    },
                    executor.username,
                    manager
                );
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

             // 🔥 trigger scheduler เฉพาะที่มี
            if (hasT1) {
                await this.callNextQueueT1(manager);
            }

            if (hasT1M) {
                await this.callNextQueueT1M(manager);
            }

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


    async changeToProcessingBatch(
    dto: { items: { order_id: number }[] },
    reqUsername: string,
    manager?: EntityManager
): Promise<ApiResponse<any>> {

    const response = new ApiResponse<any>();
    const operation = "OrchestratedTaskService.changeToProcessingBatch";

    if (!dto?.items?.length) {
        return response.setIncomplete("items[] is required");
    }

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

        for (const item of dto.items) {

            const orderId = item.order_id;

            /* 1️⃣ Load order */
            const order = await ordersRepo.findOne({
                where: { order_id: orderId }
            });

            if (!order) {
                throw new Error(`Order not found: ${orderId}`);
            }

            /* 2️⃣ ต้องเป็น PENDING เท่านั้น */
            if (![StatusOrders.PENDING, StatusOrders.QUEUE].includes(order.status)) {
                throw new Error(
                    `${orderId}: Only PENDING or QUEUE status can be changed to PROCESSING`
                );
            }

            /* 3️⃣ Update status */
            await ordersRepo.update(
                { order_id: orderId },
                {
                    status: StatusOrders.PROCESSING,
                    started_at: new Date()
                }
            );

            /* 4️⃣ Log event */
            await logService.logTaskEvent(useManager, order, {
                actor: reqUsername,
                status: StatusOrders.PROCESSING
            });

            updated.push(orderId);
        }

        if (!manager && queryRunner) {
            await queryRunner.commitTransaction();
        }

        return response.setComplete("create completed", {
            updated
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

    //เฉพาะ transfer
    async transferChangeToBatch(
        dto: {
            items: { order_id: number }[];
            transfer_status: string;
        },
        reqUsername: string,
        manager?: EntityManager
    ): Promise<ApiResponse<any>> {

        const response = new ApiResponse<any>();
        const operation = "OrderTransferService.transferChangeToBatch";

        if (!dto?.items?.length) {
            return response.setIncomplete("items[] is required");
        }

        if (!dto?.transfer_status) {
            return response.setIncomplete("transfer_status is required");
        }

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

            const orderTransferRepo = useManager.getRepository(OrdersTransfer);
            const ordersRepo = useManager.getRepository(Orders);

            // 🔥 Strict loop — error ตัวเดียว rollback ทั้งหมด
            const updated = new Set<number>();

            for (const item of dto.items) {

                const orderId = item.order_id;

                const transfer = await orderTransferRepo.findOne({
                    where: { order_id: orderId },
                });

                if (!transfer) {
                    throw new Error(`OrderTransfer not found: ${orderId}`);
                }

                const order = await ordersRepo.findOne({
                    where: { order_id: orderId },
                });

                if (!order) {
                    throw new Error(`Order not found: ${orderId}`);
                }

                // update current transfer (ถ้าไม่ซ้ำ)
                if (transfer.transfer_status !== dto.transfer_status) {
                    await orderTransferRepo.update(
                        { order_id: orderId },
                        { transfer_status: dto.transfer_status }
                    );
                }

                updated.add(orderId);

                // 🔥 Auto-complete OUT
                if (
                    order.transfer_scenario === 'INTERNAL_IN' &&
                    dto.transfer_status === 'COMPLETED'
                ) {

                    const parent = await orderTransferRepo.findOne({
                        where: { related_order_id: orderId },
                    });

                    if (!parent) {
                        throw new Error(`Parent transfer not found for IN order ${orderId}`);
                    }

                    if (parent.transfer_status !== 'PICK_SUCCESS') {
                        throw new Error(
                            `Parent order ${parent.order_id} must be PICK SUCCESS before completing`
                        );
                    }

                    // 🔥 ถ้ามาถึงตรงนี้ แปลว่า parent = PICK_SUCCESS แน่นอน
                    await orderTransferRepo.update(
                        { order_id: parent.order_id },
                        { transfer_status: 'COMPLETED' }
                    );

                    updated.add(parent.order_id);
                }
            }

            // Commit
            if (!manager && queryRunner) {
                await queryRunner.commitTransaction();
            }

            return response.setComplete("transferChangeToBatch completed", {
                updated: Array.from(updated),
                transfer_status: dto.transfer_status,
            });

        } catch (error: any) {

            if (!manager && queryRunner) {
                await queryRunner.rollbackTransaction();
            }

            console.error(`Error during ${operation}:`, error);

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

    //ฟังก์ชัน ทำ warning
    private async createOrderWarning(
        manager: EntityManager,
        order: Orders,
        event_code: string,
        reqUsername: string
    ) {
        const eventRepo = manager.getRepository(Events);
        const stockItemRepo = manager.getRepository(StockItems);
        const locationRepo = manager.getRepository(Locations);

        /* 🔹 ดึงชื่อสินค้า */
        const stockItem = await stockItemRepo.findOne({
            where: { item_id: order.item_id }
        });

        /* 🔹 ดึงชื่อ location */
        const location = await locationRepo.findOne({
            where: { loc_id: order.loc_id }
        });

        const stockName = stockItem?.stock_item ?? order.item_id;
        const boxLoc = location?.box_loc ?? order.loc_id;

        const messageMap: Record<string, string> = {
            SCAN_FEW: `User "${reqUsername}" has completed order ${stockName} at ${boxLoc}: scanned fewer items than required`,
            SCAN_MANY: `User "${reqUsername}" has completed order ${stockName} at ${boxLoc}: scanned too many items`,
            INVALID_QTY: `User "${reqUsername}" has completed order ${stockName} at ${boxLoc}: invalid quantity`
        };

        await eventRepo.save({
            type: "EVENT",
            category: "WARNING",
            event_code: event_code,
            message: messageMap[event_code] ?? `${stockName} at ${boxLoc}: warning`,
            related_id: order.order_id,
            level: "WARNING",
            status: "ACTIVE",
            is_cleared: true,
            store_type: order.store_type,
            created_by: "SYSTEM"
        });
    }

    /*กรณี AUTO ใช้ตอนกด auto หน้า execution*/
    private async finishOrderCore(
        manager: EntityManager,
        order: Orders,
        actual_qty: number,
        reqUsername: string
    ): Promise<{ counterId: number | null }> {

        const ordersRepo = manager.getRepository(Orders);
        const counterRepo = manager.getRepository(Counter);
        const wrsRepo = manager.getRepository(WRS);

        /* VALIDATION */
        if (order.store_type !== "T1")
            throw new Error(`Order ${order.order_id} is not T1`);

        if (order.plan_qty == null)
            throw new Error(`Plan qty missing`);

        if (actual_qty < 0 || actual_qty > order.plan_qty)
            throw new Error(`Invalid actual qty`);

        const isCompleted = actual_qty === order.plan_qty;

        /* WARNING CHECK */
        if (actual_qty < order.plan_qty) {
            await this.createOrderWarning(manager, order, "SCAN_FEW", reqUsername);
        }

        /* UPDATE ORDER */
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
        
        await ordersLogService.logTaskEvent(manager, order, {
            actor: reqUsername,
            status: order.status
        });

        const eventRepo = manager.getRepository(Events);
        await eventRepo.save({
            type: 'EVENT',
            category: 'ORDERS',
            event_code: `ORDER_${order.status}`,
            message: `User "${reqUsername}" has ${order.status} order`,
            level: 'INFO',
            status: 'ACTIVE',
            related_id: order.order_id,
            created_by: reqUsername
        });

        /* INVENTORY */
        switch (order.type) {
            case TypeInfm.RECEIPT:
                await inventoryService.receipt(manager, order);
                break;
            case TypeInfm.USAGE:
                await inventoryService.usage(manager, order);
                break;
            case TypeInfm.TRANSFER:
                await inventoryService.transfer(manager, order);
                break;
            case TypeInfm.RETURN:
                // temporary skip inventory
                console.log(`RETURN order ${order.order_id} skipped inventory`);
                break;
            default:
                throw new Error(`Unsupported type`);
        }

        /* RESET COUNTER */
        let counterId: number | null = null;

        const counter = await counterRepo.findOne({
            where: { current_order_id: order.order_id },
            lock: { mode: "pessimistic_write" }
        });

        if (counter) {
            counterId = counter.counter_id;
            counter.status = "EMPTY";
            counter.current_order_id = null;
            counter.current_wrs_id = null;
            counter.light_color_hex = null;
            counter.light_mode = "OFF";
            counter.last_event_at = new Date();
            await counterRepo.save(counter);
        }

        /* RESET WRS */
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
        
            await wrsLogService.createLog(manager,{
                wrs_id: wrs.wrs_id,
                order_id: order.order_id,
                status: 'IDLE',
                operator: ControlSource.MANUAL, // หรือ AUTO แล้วแต่ flow
                event: 'Order finished, Set WRS to IDLE',
                message: `Order ${order.order_id} finished by ${reqUsername}`
            });
        }
        return { counterId };
    }

    async handleOrderItemWRS(
        order_id: number,
        actual_qty: number,
        reqUsername: string
    ): Promise<ApiResponse<any>> {

        const response = new ApiResponse<any>();

        let counterId: number | null = null;
        let order!: Orders;

        try {

            await AppDataSource.transaction(async (manager) => {

                const ordersRepo = manager.getRepository(Orders);

                order = await ordersRepo.findOneOrFail({
                    where: { order_id },
                    lock: { mode: "pessimistic_write" }
                });

                if (!order)
                    throw new Error(`Order not found`);

                if (order.status !== StatusOrders.PROCESSING || order.is_confirm)
                    throw new Error(`Invalid order state`);

                const result = await this.finishOrderCore(
                    manager,
                    order,
                    actual_qty,
                    reqUsername
                );

                counterId = result.counterId;
            });

        } catch (error: any) {
            return response.setIncomplete(error.message);
        }

        /* POST COMMIT */
        try {
            if (counterId) {
                await runtimeService.reset(counterId);
                broadcast(counterId, { counter_id: counterId, actualQty: 0 });
            }

            await AppDataSource.transaction(async (manager) => {
                await this.callNextQueueT1(manager);
            });

        } catch (e) {
            console.error("Post-commit error:", e);
        }

        return response.setComplete("T1 order handled", {
            order_id: order.order_id
        });
    }

    /*ใช้ตอนกด force manual*/
    async handleErrorOrderItemWRS(
        event_id: number,
        items: { order_id: number; actual_qty: number }[],
        reqUsername: string
    ): Promise<ApiResponse<any>> {

        const response = new ApiResponse<any>();

        const counterIds: number[] = [];

        try {

            /* =========================
            MAIN TRANSACTION
            ========================== */
            await AppDataSource.transaction(async (manager) => {

                const ordersRepo = manager.getRepository(Orders);
                const eventRepo = manager.getRepository(Events);
                const ordersTransferRepo = manager.getRepository(OrdersTransfer);

                /* 1️⃣ LOCK EVENT ROW */
                const event = await eventRepo.findOne({
                    where: { id: event_id },
                    lock: { mode: "pessimistic_write" }
                });

                if (!event)
                    throw new Error("Event not found");

                if (event.is_cleared)
                    throw new Error("Event already cleared");

                /* 2️⃣ LOOP PROCESS ORDERS */
                for (const item of items) {

    const order = await ordersRepo.findOne({
        where: { order_id: item.order_id },
        lock: { mode: "pessimistic_write" }
    });

    if (!order)
        throw new Error(`Order ${item.order_id} not found`);

    const ordersToFinish: Orders[] = [order];

    /* TRANSFER CASE */
    if (
        order.type === TypeInfm.TRANSFER &&
        order.transfer_scenario === "INTERNAL_OUT"
    ) {

        const transfer = await ordersTransferRepo.findOne({
            where: { order_id: order.order_id }
        });

        if (transfer?.related_order_id) {

            const relatedOrder = await ordersRepo.findOne({
                where: { order_id: transfer.related_order_id },
                lock: { mode: "pessimistic_write" }
            });

            if (
                relatedOrder &&
                relatedOrder.status !== StatusOrders.COMPLETED
            ) {
                ordersToFinish.push(relatedOrder);
            }
        }
    }

    /* FINISH ALL */
    for (const o of ordersToFinish) {

        const result = await this.finishOrderCore(
            manager,
            o,
            item.actual_qty,
            reqUsername
        );

        if (result.counterId)
            counterIds.push(result.counterId);

        /* UPDATE TRANSFER STATUS */
if (o.type === TypeInfm.TRANSFER) {

    // update ของ order ปัจจุบัน
    await ordersTransferRepo.update(
        { order_id: o.order_id },
        { transfer_status: "COMPLETED" }
    );

    /* 🔹 ถ้าเป็น INTERNAL_IN ต้อง update parent (INTERNAL_OUT) ด้วย */
    if (o.transfer_scenario === "INTERNAL_IN") {

        const parentTransfer = await ordersTransferRepo.findOne({
    where: { related_order_id: o.order_id },
    lock: { mode: "pessimistic_write" }
});

        if (parentTransfer) {

            await ordersTransferRepo.update(
                { order_id: parentTransfer.order_id },
                { transfer_status: "COMPLETED" }
            );

        }
    }
}
    }
}

                /* 3️⃣ CLEAR EVENT (1 ROW ONLY) */
                await eventRepo.update(
                    { id: event_id },
                    {
                        is_cleared: true,
                        cleared_by: reqUsername,
                        cleared_at: new Date()
                    }
                );

            }); // 🔥 COMMIT HERE

        } catch (error: any) {
            return response.setIncomplete(error.message);
        }

        /* =========================
        POST COMMIT
        ========================== */
        try {

            /* 4️⃣ CREATE 1 CLEAR EVENT */
            await eventService.createEvent(null,{
                type: 'EVENT',
                category: 'WRS',
                event_code: 'AMR_ERROR_CLEARED',
                message: `AMR Error Cleared`,
                level: 'INFO',
                status: 'CLEARED',
                related_id: event_id,
                created_by: reqUsername
            });

            /* 5️⃣ RESET ALL COUNTERS */
            for (const counterId of counterIds) {
                await runtimeService.reset(counterId);
                broadcast(counterId, {
                    counter_id: counterId,
                    actualQty: 0
                });
            }

            /* 6️⃣ CALL NEXT QUEUE AFTER EVERYTHING */
            await AppDataSource.transaction(async (manager) => {
                await this.callNextQueueT1(manager);
            });

        } catch (e) {
            console.error("Post-commit error:", e);
        }

        return response.setComplete("ERROR orders handled", {
            event_id
        });
    }

    async callNextQueueT1(manager: EntityManager) {

        const ordersRepo = manager.getRepository(Orders);
        const counterRepo = manager.getRepository(Counter);

        for (let i = 0; i < 20; i++) { // 🔥 safety limit

            const counter = await counterRepo.findOne({
                where: { status: 'EMPTY' },
                order: { last_event_at: 'ASC' },
                lock: { mode: "pessimistic_write" }
            });

            // ❌ ไม่มี counter ว่าง → จบ loop
            if (!counter) break;

            const nextOrder = await ordersRepo.findOne({
                where: { store_type: 'T1', status: StatusOrders.QUEUE },
                order: { priority: 'DESC', requested_at: 'ASC' },
                lock: { mode: "pessimistic_write" }
            });

            // ❌ ไม่มี order → จบ loop
            if (!nextOrder) break;

            const result = await this.t1Orders.executeT1Order(
                nextOrder.order_id,
                manager
            );

            // 🔥 logic หยุด / ไปต่อ
            if (['NO_COUNTER', 'NO_AMR'].includes(result))
                break;

            // ข้าม order นี้ ไปดูตัวถัดไป
            if (result === 'SKIPPED')
                continue;
        }
    }

    async callNextQueueT1M(manager: EntityManager) {
        const ordersRepo = manager.getRepository(Orders);
        const aisleRepo = manager.getRepository(Aisle);

        for (let i = 0; i < 20; i++) {

            // ❌ ถ้ามี aisle ทำงานอยู่ → หยุด (ทีละ 1 order)
            const busyAisle = await aisleRepo.findOne({
                where: [
                    { status: AisleStatus.OPEN },
                    { status: AisleStatus.ERROR }
                ]
            });

            if (busyAisle) break;

            // 🔍 หา order
            const nextOrder = await ordersRepo.findOne({
                where: {
                    store_type: 'T1M',
                    status: StatusOrders.QUEUE
                },
                order: { priority: 'DESC', requested_at: 'ASC' },
                lock: { mode: "pessimistic_write" }
            });

            if (!nextOrder) break;

            // 🔥 เลือก aisle ที่ว่างนานสุด
            const selectedAisle = await aisleRepo.findOne({
                where: { status: AisleStatus.CLOSED },
                order: { last_opened_at: 'ASC' }, // ⭐ KEY POINT
                lock: { mode: "pessimistic_write" }
            });

            if (!selectedAisle) break;

            // 🔒 จอง aisle
            await aisleRepo.update(
                { aisle_id: selectedAisle.aisle_id },
                {
                    status: AisleStatus.OPEN,
                    current_order_id: nextOrder.order_id,
                    last_opened_at: new Date()
                }
            );

            // 🚀 execute
            const r = await this.changeToProcessingBatch(
                {
                    items: [{ order_id: nextOrder.order_id }]
                },
                'system',
                manager
            );

            if (!r.isCompleted) break;
        }
    }

    /*กรณี MANUAL ใช้ตอนกด manual หน้า execution*/
    private async finishManualOrderCore(
        manager: EntityManager,
        order: Orders,
        actual_qty: number,
        reqUsername: string
    ): Promise<void> {

        const ordersRepo = manager.getRepository(Orders);

        // 🔹 Validation
        // if (order.status !== StatusOrders.PENDING)
        //     throw new Error(`Order ${order.order_id} is not pending`);

        // if (order.execution_mode !== "MANUAL")
        //     throw new Error(`Order ${order.order_id} is not manual`);

        if (actual_qty < 0 || actual_qty > (order.plan_qty || 0))
            throw new Error(`Invalid actual quantity`);

        const isCompleted = actual_qty === order.plan_qty;

        // 🔹 Update Order
        order.actual_qty = actual_qty;
        order.actual_by = reqUsername;
        order.started_at = new Date();
        order.finished_at = new Date();
        order.is_confirm = true;
        order.status = isCompleted ? StatusOrders.COMPLETED : StatusOrders.FINISHED;
        order.actual_status = isCompleted ? ScanStatus.COMPLETED : ScanStatus.PARTIAL;

        await ordersRepo.save(order);

        // 🔹 Log event
        await ordersLogService.logTaskEvent(manager, order, {
            actor: reqUsername,
            status: order.status
        });

        const eventRepo = manager.getRepository(Events);
        await eventRepo.save({
            type: 'EVENT',
            category: 'ORDERS',
            event_code: `ORDER_${order.status}`,
            message: `User "${reqUsername}" has ${order.status} order`,
            level: 'INFO',
            status: 'ACTIVE',
            related_id: order.order_id,
            created_by: reqUsername
        });

        // 🔹 Inventory update (เหมือน finishOrderCore)
        switch (order.type) {
            case TypeInfm.RECEIPT:
                await inventoryService.receipt(manager, order);
                break;
            case TypeInfm.USAGE:
                await inventoryService.usage(manager, order);
                break;
            case TypeInfm.TRANSFER:
                await inventoryService.transfer(manager, order);

                // ⭐ update orders_transfer เมื่อจบ transfer
                // if (order.transfer_scenario !== "INTERNAL_IN") {
                //     const transferRepo = manager.getRepository(OrdersTransfer);

                //     await transferRepo.update(
                //         { order_id: order.order_id },
                //         { transfer_status: "COMPLETED" }
                //     );
                // }

    const transferRepo = manager.getRepository(OrdersTransfer);

    await transferRepo.update(
        [
            { order_id: order.order_id },
            { related_order_id: order.order_id }
        ],
        { transfer_status: "COMPLETED" }
    );
                break;
            case TypeInfm.RETURN:
                // temporary skip inventory
                console.log(`RETURN order ${order.order_id} skipped inventory`);
                break;
                
            default:
                throw new Error(`Unsupported type`);
        }

        // 🔹 ไม่มีการ reset counter หรือ callNextQueueT1
    }

    public async handleManualOrder(
        items: { order_id: number; actual_qty: number }[],
        reqUsername: string
    ): Promise<ApiResponse<any>> {
        const response = new ApiResponse<any>();

        if (!items?.length) {
            return response.setIncomplete("No orders provided");
        }

        try {
            await AppDataSource.transaction(async (manager) => {
                const ordersRepo = manager.getRepository(Orders);

                for (const item of items) {
                    const { order_id, actual_qty } = item;

                    // 🔹 หา order ที่ PENDING และ MANUAL
                    const order = await ordersRepo.findOneOrFail({
                        where: { order_id },
                        lock: { mode: "pessimistic_write" }
                    });

                    if (actual_qty < 0 || actual_qty > (order.plan_qty || 0)) {
                        throw new Error(`Invalid actual quantity for order ${order_id}`);
                    }

                    // 🔹 เรียก finishManualOrderCore
                    await this.finishManualOrderCore(manager, order, actual_qty, reqUsername);
                }
            });

            return response.setComplete("Manual orders processed", {
                processed: items.map(i => i.order_id)
            });

        } catch (error: any) {
            console.error("handleManualOrder error:", error);
            return response.setIncomplete(error.message);
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

    //เช็ค inv/item/location
//     async validateOrders(orders: Orders[]) {
//     const validOrders = [];
//     const invalidOrders = [];

//     for (const order of orders) {

//         const stockItem = await StockItem.findOne({
//             where: { id: order.item_id }
//         });

//         if (!stockItem) {
//             invalidOrders.push({
//                 order_id: order.order_id,
//                 reason: "Stock item not found"
//             });
//             continue;
//         }

//         const inventory = await Inventory.findOne({
//             where: {
//                 item_id: order.item_id,
//                 location_id: order.location_id
//             }
//         });

//         if (!inventory) {
//             invalidOrders.push({
//                 order_id: order.order_id,
//                 reason: "Inventory not found"
//             });
//             continue;
//         }

//         if (inventory.qty < order.plan_qty) {
//             invalidOrders.push({
//                 order_id: order.order_id,
//                 reason: "Insufficient stock"
//             });
//             continue;
//         }

//         validOrders.push(order);
//     }

//     return {
//         validOrders,
//         invalidOrders
//     };
// }
}
