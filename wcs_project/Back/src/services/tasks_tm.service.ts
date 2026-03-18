import { AppDataSource } from "../config/app-data-source";
import { EntityManager, In, QueryFailedError, Repository } from 'typeorm';
import { ApiResponse } from '../models/api-response.model';
import { Orders} from '../entities/orders.entity';
import { AisleStatus, ControlSource, ScanStatus, StatusMRS, StatusOrders, TypeInfm } from '../common/global.enum';
import * as validate from '../utils/ValidationUtils';
import * as lang from '../utils/LangHelper';
import { EventService } from "../utils/EventService";
import { OrdersLogService } from "../utils/logTaskEvent";
import { InventoryService } from "./inventory.service";
import { Events } from "../entities/s_events.entity";
import { OrdersTransfer } from "../entities/order_transfer.entity";
import { Locations } from "../entities/m_location.entity";
import { StockItems } from "../entities/m_stock_items.entity";

const eventService = new EventService();
const ordersLogService = new OrdersLogService();
const inventoryService = new InventoryService();

export class TMStoreService {

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
            if (order.status !== StatusOrders.PENDING) {
                throw new Error(
                    `${orderId}: Only PENDING status can be changed to PROCESSING`
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
): Promise<void> {

    const ordersRepo = manager.getRepository(Orders);

    /* VALIDATION */
    if (order.store_type !== "T1M")
        throw new Error(`Order ${order.order_id} is not T1M`);

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

        /* RESET WRS */
        // const wrs = await wrsRepo.findOne({
        //     where: { current_order_id: order.order_id },
        //     lock: { mode: "pessimistic_write" }
        // });

        // if (wrs) {
        //     wrs.wrs_status = "IDLE";
        //     wrs.is_available = true;
        //     wrs.current_order_id = null;
        //     wrs.target_counter_id = null;
        //     wrs.last_heartbeat = new Date();
        //     await wrsRepo.save(wrs);
        
        //     await wrsLogService.createLog(manager,{
        //         wrs_id: wrs.wrs_id,
        //         order_id: order.order_id,
        //         status: 'IDLE',
        //         operator: ControlSource.MANUAL, // หรือ AUTO แล้วแต่ flow
        //         event: 'Order finished, Set WRS to IDLE',
        //         message: `Order ${order.order_id} finished by ${reqUsername}`
        //     });
        // }
        // return { counterId };
    }

async handleOrderItemMRS(
    order_id: number,
    actual_qty: number,
    reqUsername: string
): Promise<ApiResponse<any>> {

    const response = new ApiResponse<any>();
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

            await this.finishOrderCore(
                manager,
                order,
                actual_qty,
                reqUsername
            );

        });

    } catch (error: any) {
        return response.setIncomplete(error.message);
    }

    return response.setComplete("T1M order handled", {
        order_id: order.order_id
    });
}

    /*ใช้ตอนกด force manual*/
async handleErrorOrderItemMRS(
    event_id: number,
    items: { order_id: number; actual_qty: number }[],
    reqUsername: string
): Promise<ApiResponse<any>> {

    const response = new ApiResponse<any>();

    try {

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

                    await this.finishOrderCore(
                        manager,
                        o,
                        item.actual_qty,
                        reqUsername
                    );

                    /* UPDATE TRANSFER STATUS */
                    if (o.type === TypeInfm.TRANSFER) {

                        await ordersTransferRepo.update(
                            { order_id: o.order_id },
                            { transfer_status: "COMPLETED" }
                        );

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

            /* 3️⃣ CLEAR EVENT */
            await eventRepo.update(
                { id: event_id },
                {
                    is_cleared: true,
                    cleared_by: reqUsername,
                    cleared_at: new Date()
                }
            );

        });

    } catch (error: any) {
        return response.setIncomplete(error.message);
    }

    /* POST COMMIT */
    try {

        await eventService.createEvent(null,{
            type: 'EVENT',
            category: 'MRS',
            event_code: 'MRS_ERROR_CLEARED',
            message: `MRS Error Cleared`,
            level: 'INFO',
            status: 'CLEARED',
            related_id: event_id,
            created_by: reqUsername
        });

    } catch (e) {
        console.error("Post-commit error:", e);
    }

    return response.setComplete("ERROR orders handled", {
        event_id
    });
}

    // async callNextQueueT1(manager: EntityManager) {

    //     const ordersRepo = manager.getRepository(Orders);
    //     const counterRepo = manager.getRepository(Counter);

    //     for (let i = 0; i < 20; i++) { // 🔥 safety limit

    //         const counter = await counterRepo.findOne({
    //             where: { status: 'EMPTY' },
    //             order: { last_event_at: 'ASC' },
    //             lock: { mode: "pessimistic_write" }
    //         });

    //         // ❌ ไม่มี counter ว่าง → จบ loop
    //         if (!counter) break;

    //         const nextOrder = await ordersRepo.findOne({
    //             where: { store_type: 'T1', status: StatusOrders.QUEUE },
    //             order: { priority: 'DESC', requested_at: 'ASC' },
    //             lock: { mode: "pessimistic_write" }
    //         });

    //         // ❌ ไม่มี order → จบ loop
    //         if (!nextOrder) break;

    //         const result = await this.t1Orders.executeT1Order(
    //             nextOrder.order_id,
    //             manager
    //         );

    //         // 🔥 logic หยุด / ไปต่อ
    //         if (['NO_COUNTER', 'NO_AMR'].includes(result))
    //             break;

    //         // ข้าม order นี้ ไปดูตัวถัดไป
    //         if (result === 'SKIPPED')
    //             continue;
    //     }
    // }

    
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


        async handleErrorOrderItemAgmb(
    event_id: number,
    items: { order_id: number; actual_qty: number }[],
    reqUsername: string
): Promise<ApiResponse<any>> {

    const response = new ApiResponse<any>();

    try {

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

                    await this.finishOrderCore(
                        manager,
                        o,
                        item.actual_qty,
                        reqUsername
                    );

                    /* UPDATE TRANSFER STATUS */
                    if (o.type === TypeInfm.TRANSFER) {

                        await ordersTransferRepo.update(
                            { order_id: o.order_id },
                            { transfer_status: "COMPLETED" }
                        );

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

            /* 3️⃣ CLEAR EVENT */
            await eventRepo.update(
                { id: event_id },
                {
                    is_cleared: true,
                    cleared_by: reqUsername,
                    cleared_at: new Date()
                }
            );

        });

    } catch (error: any) {
        return response.setIncomplete(error.message);
    }

    /* POST COMMIT */
    try {

        await eventService.createEvent(null,{
            type: 'EVENT',
            category: 'AGMB',
            event_code: 'AGMB_ERROR_CLEARED',
            message: `AGMB Error Cleared`,
            level: 'INFO',
            status: 'CLEARED',
            related_id: event_id,
            created_by: reqUsername
        });

    } catch (e) {
        console.error("Post-commit error:", e);
    }

    return response.setComplete("ERROR orders handled", {
        event_id
    });
}
}