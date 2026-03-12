import { Repository, EntityManager, Not, QueryFailedError } from 'typeorm';
import { AppDataSource } from '../config/app-data-source';
import { ApiResponse } from '../models/api-response.model';
import * as lang from '../utils/LangHelper';
import { Events } from '../entities/s_events.entity';
import { Orders } from '../entities/orders.entity';
import { WRS } from '../entities/wrs.entity';
import { OrdersUsage } from '../entities/order_usage.entity';
import { StockItems } from '../entities/m_stock_items.entity';
import { Counter } from '../entities/counter.entity';
import { ControlSource, StatusOrders, TypeInfm } from '../common/global.enum';
import { OrdersLogService } from '../utils/logTaskEvent';
import { EventService } from '../utils/EventService';
import { WrsLogService } from '../utils/LogWrsService';
import { broadcast } from './sse.service';
import { OrdersTransfer } from '../entities/order_transfer.entity';

const logService = new OrdersLogService();
const eventService = new EventService();
const wrsLogService = new WrsLogService();

export class EventsService {
    private eventsRepository: Repository<Events>;
    private ordersRepository: Repository<Orders>;
    private wrsRepository: Repository<WRS>;

    constructor(){
        this.eventsRepository = AppDataSource.getRepository(Events);
        this.ordersRepository = AppDataSource.getRepository(Orders);
        this.wrsRepository = AppDataSource.getRepository(WRS);
    }

    // async setOrderError(
    //     order_id: number,
    //     reqUsername: string,
    //     manager?: EntityManager
    //     ): Promise<ApiResponse<any>> {

    //     const response = new ApiResponse<any>();
    //     const operation = 'EventsService.setOrderError';

    //     const queryRunner = manager ? null : AppDataSource.createQueryRunner();
    //     const useManager = manager ?? queryRunner?.manager;

    //     if (!useManager) {
    //         return response.setIncomplete("No entity manager available");
    //     }

    //     if (!manager && queryRunner) {
    //         await queryRunner.connect();
    //         await queryRunner.startTransaction();
    //     }

    //     let counterId: number | null = null;

    //     try {
    //         const ordersRepo = useManager.getRepository(Orders);
    //         const wrsRepo = useManager.getRepository(WRS);
    //         const counterRepo = useManager.getRepository(Counter);
    //         const eventRepo = useManager.getRepository(Events);

    //         /* 1️⃣ LOCK ORDER */
    //         const order = await ordersRepo.findOne({
    //             where: { order_id },
    //             lock: { mode: "pessimistic_write" }
    //         });

    //         if (!order)
    //         throw new Error("Order not found");

    //         if (order.status === StatusOrders.ERROR)
    //         throw new Error("Order already ERROR");

    //         /* 2️⃣ UPDATE ORDER */
    //         order.status = StatusOrders.ERROR;
    //         await ordersRepo.save(order);

    //         /* 3️⃣ INSERT ORDER LOG */
    //         await logService.logTaskEvent(
    //             useManager,
    //             order,
    //             {
    //                 actor: reqUsername,
    //                 status: StatusOrders.ERROR,
    //             }
    //         );

    //         /* 4️⃣ FIND WRS BY current_order_id */
    //         const wrs = await wrsRepo.findOne({
    //             where: { current_order_id: order_id },
    //             lock: { mode: "pessimistic_write" }
    //         });

    //         if (!wrs)
    //         throw new Error("WRS not found for this order");

    //         const wrsId = wrs.wrs_id;

    //         /* 5️⃣ INSERT EVENT */
    //         await eventRepo.insert({
    //             type: "ERROR",
    //             category: "WRS",
    //             event_code: "AMR_ERROR",
    //             message: `AMR-${wrs.wrs_code} Error`,   // ถ้ามี wrs_code
    //             related_id: wrsId,                     // 👈 สำคัญ
    //             level: "ERROR",
    //             status: "ACTIVE",
    //             created_at: new Date(),
    //             created_by: "SYSTEM AMR",
    //             is_cleared: false,
    //             order_id: order_id,
    //             store_type: order.store_type
    //         });

    //         /* 6️⃣ UPDATE WRS STATUS */
    //         if (wrs.wrs_status !== 'ERROR') {
    //             wrs.wrs_status = 'ERROR';
    //             await wrsRepo.save(wrs);
    //         }

    //         /* 6.1 INSERT WRS LOG */
    //         await wrsLogService.createLog(useManager, {
    //             wrs_id: wrs.wrs_id,
    //             order_id: order.order_id,
    //             status: 'ERROR',
    //             operator: ControlSource.MANUAL,
    //             event: 'Order Error',
    //             message: `Order ${order.order_id} Error by AMR ${wrs.wrs_code}`
    //         });

    //         /* 7 UPDATE COUNTER */
    //         const counter = await counterRepo.findOne({
    //             where: { current_order_id: order_id },
    //             lock: { mode: "pessimistic_write" }
    //         });

    //         if (counter) {
    //             counter.status = 'ERROR';
    //             await counterRepo.save(counter);
    //             counterId = counter.counter_id;
    //         }

    //         if (!manager && queryRunner) {
    //             await queryRunner.commitTransaction();
    //         }

    //     } catch (error: any) {

    //         if (!manager && queryRunner) {
    //         await queryRunner.rollbackTransaction();
    //         }

    //         console.error(`Error during ${operation}:`, error);

    //         return response.setIncomplete(error.message);

    //     } finally {
    //         if (!manager && queryRunner) {
    //         await queryRunner.release();
    //         }
    //     }

    //     // /* POST COMMIT */
    //     // try {
    //     //     if (counterId) {
    //     //     broadcast(counterId, {
    //     //         counter_id: counterId,
    //     //         status: "ERROR"
    //     //     });
    //     //     }
    //     // } catch (e) {
    //     //     console.error("Broadcast error:", e);
    //     // }

    //     return response.setComplete("Order set to ERROR", { order_id });
    // }

    async setOrderError(
        order_id: number,
        reqUsername: string,
        manager?: EntityManager
        ): Promise<ApiResponse<any>> {

        const response = new ApiResponse<any>();
        const operation = 'EventsService.setOrderError';

        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager ?? queryRunner?.manager;

        if (!useManager) {
            return response.setIncomplete("No entity manager available");
        }

        if (!manager && queryRunner) {
            await queryRunner.connect();
            await queryRunner.startTransaction();
        }

        let counterId: number | null = null;

        try {

            const ordersRepo = useManager.getRepository(Orders);
            const wrsRepo = useManager.getRepository(WRS);
            const counterRepo = useManager.getRepository(Counter);
            const eventRepo = useManager.getRepository(Events);
            const orderTransferRepo = useManager.getRepository(OrdersTransfer);

            /* 1️⃣ LOCK ORDER */
            const order = await ordersRepo.findOne({
            where: { order_id },
            lock: { mode: "pessimistic_write" }
            });

            if (!order) {
            throw new Error(`Order ${order_id} not found`);
            }

            if (order.status === StatusOrders.ERROR) {
            throw new Error(`Order ${order_id} already ERROR`);
            }

            /* 2️⃣ UPDATE ORDER STATUS */
            order.status = StatusOrders.ERROR;
            await ordersRepo.save(order);

            /* UPDATE TRANSFER STATUS (if transfer order) */
            if (order.type === TypeInfm.TRANSFER) {
                const transfer = await orderTransferRepo.findOne({
                    where: { order_id },
                    lock: { mode: "pessimistic_write" }
                });

                if (transfer && transfer.transfer_status !== StatusOrders.ERROR) {
                    transfer.transfer_status = StatusOrders.ERROR;
                    await orderTransferRepo.save(transfer);
                }
            }

            /* 3️⃣ INSERT ORDER LOG */
            await logService.logTaskEvent(
            useManager,
            order,
            {
                actor: reqUsername,
                status: StatusOrders.ERROR,
            }
            );

            /* 4️⃣ FIND WRS */
            const wrs = await wrsRepo.findOne({
            where: { current_order_id: order_id },
            lock: { mode: "pessimistic_write" }
            });

            if (!wrs) {
            throw new Error(`WRS not found for order ${order_id}`);
            }

            const wrsId = wrs.wrs_id;
            const wrsCode = wrs.wrs_code ?? "UNKNOWN";

            /* 5️⃣ INSERT EVENT */
            await eventRepo.insert({
            type: "ERROR",
            category: "WRS",
            event_code: "AMR_ERROR",
            message: `AMR-${wrsCode} Error`,
            related_id: wrsId,
            level: "ERROR",
            status: "ACTIVE",
            created_at: new Date(),
            created_by: "SYSTEM AMR",
            is_cleared: false,
            order_id: order_id,
            store_type: order.store_type
            });

            /* 6️⃣ UPDATE WRS STATUS */
            if (wrs.wrs_status !== 'ERROR') {
            wrs.wrs_status = 'ERROR';
            await wrsRepo.save(wrs);
            }

            /* 7️⃣ INSERT WRS LOG */
            await wrsLogService.createLog(useManager, {
            wrs_id: wrsId,
            order_id: order.order_id,
            status: 'ERROR',
            operator: ControlSource.MANUAL,
            event: 'Order Error',
            message: `Order ${order.order_id} Error by AMR ${wrsCode}`
            });

            /* 8️⃣ UPDATE COUNTER */
            const counter = await counterRepo.findOne({
            where: { current_order_id: order_id },
            lock: { mode: "pessimistic_write" }
            });

            if (counter && counter.status !== 'ERROR') {
            counter.status = 'ERROR';
            await counterRepo.save(counter);
            counterId = counter.counter_id;
            }

            if (!manager && queryRunner) {
            await queryRunner.commitTransaction();
            }

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

        /* POST COMMIT (Realtime Notification) */
        try {
            if (counterId) {
            broadcast(counterId, {
                counter_id: counterId,
                status: "ERROR"
            });
            }
        } catch (e) {
            console.error("Broadcast error:", e);
        }

        return response.setComplete("Order set to ERROR", { order_id });
    }

    async clearOrderError(
        event_id: number,
        reqUsername: string,
        manager?: EntityManager
    ): Promise<ApiResponse<any>> {

        const response = new ApiResponse<any>();
        const operation = 'EventsService.clearOrderError';

        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager ?? queryRunner?.manager;

        if (!useManager) {
            return response.setIncomplete("No entity manager available");
        }

        if (!manager && queryRunner) {
            await queryRunner.connect();
            await queryRunner.startTransaction();
        }

        try {

            const ordersRepo = useManager.getRepository(Orders);
            const wrsRepo = useManager.getRepository(WRS);
            const counterRepo = useManager.getRepository(Counter);
            const eventRepo = useManager.getRepository(Events);
            const orderTransferRepo = useManager.getRepository(OrdersTransfer);

            /* 1️⃣ LOCK EVENT */
            const event = await eventRepo.findOne({
                where: { id: event_id },
                lock: { mode: "pessimistic_write" }
            });

            if (!event)
                throw new Error("Event not found");

            if (event.is_cleared)
                throw new Error("Event already cleared");

            if (!event.related_id)
                throw new Error("Event does not contain related WRS id");

            const wrs_id = event.related_id;

            /* 2️⃣ LOCK WRS (by wrs_id) */
            const wrs = await wrsRepo.findOne({
                where: { wrs_id },
                lock: { mode: "pessimistic_write" }
            });

            if (!wrs)
                throw new Error("WRS not found");

            if (!wrs.current_order_id)
                throw new Error("WRS does not contain current order");

            const order_id = wrs.current_order_id;

            /* 3️⃣ LOCK ORDER */
            const order = await ordersRepo.findOne({
                where: { order_id },
                lock: { mode: "pessimistic_write" }
            });

            if (!order)
                throw new Error("Order not found");

            if (order.status !== StatusOrders.ERROR)
                throw new Error("Order is not in ERROR state");

            /* 4️⃣ UPDATE ORDER → PROCESSING */
            order.status = StatusOrders.PROCESSING;
            await ordersRepo.save(order);

            /* 4.1️⃣ UPDATE TRANSFER STATUS → PROCESSING (if transfer order) */
            if (order.type === TypeInfm.TRANSFER) {

                const transfer = await orderTransferRepo.findOne({
                    where: { order_id },
                    lock: { mode: "pessimistic_write" }
                });

                if (transfer && transfer.transfer_status === StatusOrders.ERROR) {
                    transfer.transfer_status = 'PROCESSING';
                    await orderTransferRepo.save(transfer);
                }
            }

            /* 5️⃣ INSERT ORDER LOG */
            await logService.logTaskEvent(
                useManager,
                order,
                {
                    actor: reqUsername,
                    status: StatusOrders.PROCESSING,
                }
            );

            /* 6️⃣ CLEAR EVENT */
            event.is_cleared = true;
            event.status = "CLEARED";
            event.cleared_by = reqUsername;
            event.cleared_at = new Date();
            await eventRepo.save(event);

            /* 6.1️⃣ CREATE CLEAR LOG EVENT */
            await eventService.createEvent(
                useManager,   // 👈 ต้องส่ง manager เดียวกัน
                {
                    type: 'EVENT',
                    category: 'WRS',
                    event_code: 'AMR_ERROR_CLEARED',
                    message: `AMR-${wrs.wrs_code} Error Cleared`,
                    level: 'INFO',
                    status: 'CLEARED',
                    related_id: event_id,   // 👈 ผูกกับ event เดิม
                    created_by: reqUsername
                }
            );

            /* 7️⃣ UPDATE WRS → DELIVERING (if previously ERROR) */
            if (wrs.wrs_status === 'ERROR') {
                wrs.wrs_status = 'DELIVERING';
                await wrsRepo.save(wrs);
            }

            /* 8️⃣ INSERT WRS LOG */
            await wrsLogService.createLog(useManager, {
                wrs_id: wrs.wrs_id,
                order_id: order.order_id,
                status: 'DELIVERING',
                operator: ControlSource.MANUAL,
                event: 'Clear Error',
                message: `Order ${order.order_id} resumed by ${reqUsername}`
            });

            /* 9️⃣ UPDATE COUNTER → WAITING_AMR */
            const counter = await counterRepo.findOne({
                where: { current_order_id: order_id },
                lock: { mode: "pessimistic_write" }
            });

            if (counter && counter.status === 'ERROR') {
                counter.status = 'WAITING_AMR';
                await counterRepo.save(counter);
            }

            if (!manager && queryRunner) {
                await queryRunner.commitTransaction();
            }

            return response.setComplete(
                "Order error cleared and resumed successfully",
                { order_id }
            );

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

    // async setOrderWarning(
    //     order_id: number,
    //     event_code: string,
    //     reqUsername: string,
    //     manager?: EntityManager
    // ): Promise<ApiResponse<any>> {

    //     const response = new ApiResponse<any>();
    //     const queryRunner = manager ? null : AppDataSource.createQueryRunner();
    //     const useManager = manager ?? queryRunner?.manager;

    //     if (!useManager) {
    //         return response.setIncomplete("No entity manager available");
    //     }

    //     if (!manager && queryRunner) {
    //         await queryRunner.connect();
    //         await queryRunner.startTransaction();
    //     }

    //     try {

    //         const ordersRepo = useManager.getRepository(Orders);
    //         const eventRepo = useManager.getRepository(Events);

    //         /* LOCK ORDER */
    //         const order = await ordersRepo.findOne({
    //             where: { order_id },
    //             lock: { mode: "pessimistic_write" }
    //         });

    //         if (!order) {
    //             throw new Error(`Order ${order_id} not found`);
    //         }

    //         /* MESSAGE MAP */
    //         const warningMessages: Record<string, string> = {
    //             SCAN_FEW: `Order ${order_id} scanned few items`,
    //             SCAN_MANY: `Order ${order_id} scanned too many items`,
    //             INVALID_QTY: `Order ${order_id} invalid quantity`
    //         };

    //         const message =
    //             warningMessages[event_code] ??
    //             `Order ${order_id} warning: ${event_code}`;

    //         /* INSERT EVENT */
    //         await eventRepo.insert({
    //             type: "EVENT",
    //             category: "WARNING",
    //             event_code: event_code,
    //             message: message,
    //             related_id: order_id,
    //             level: "WARNING",
    //             status: "ACTIVE",
    //             is_cleared: true,
    //             created_at: new Date(),
    //             created_by: reqUsername,
    //             order_id: order_id,
    //             store_type: order.store_type
    //         });

    //         if (!manager && queryRunner) {
    //             await queryRunner.commitTransaction();
    //         }

    //     } catch (error: any) {

    //         if (!manager && queryRunner) {
    //             await queryRunner.rollbackTransaction();
    //         }

    //         return response.setIncomplete(error.message);

    //     } finally {

    //         if (!manager && queryRunner) {
    //             await queryRunner.release();
    //         }

    //     }

    //     return response.setComplete("Warning event created", { order_id });
    // }

    async getAll(manager?: EntityManager): Promise<ApiResponse<any | null>> {
        const response = new ApiResponse<any | null>();
        const operation = 'EventsService.getAll';

        try {
            const repository = manager
                ? manager.getRepository(Events)
                : this.eventsRepository;

            const rawData = await repository
                .createQueryBuilder('data')
                .select([
                    'data.id AS event_id',
                    'data.type AS type',
                    'data.category AS category',
                    'data.message AS message',
                    'data.related_id AS related_id',
                    'data.is_cleared AS is_cleared',
                    "DATE_FORMAT(data.created_at, '%d/%m/%Y %H:%i:%s') AS created_at",
                ])
                .orderBy('data.created_at', 'DESC')
                .getRawMany();

            if (!rawData || rawData.length === 0) {
                return response.setIncomplete(lang.msgNotFound('events data'));
            }

            const result = rawData.map(row => ({
                ...row,
                is_cleared: Boolean(row.is_cleared)
            }));

            return response.setComplete(
                lang.msgFound('events data'),
                result
            );

        } catch (error: any) {
            console.error('Error in getAll:', error);

            if (error instanceof QueryFailedError) {
                return response.setIncomplete(
                    lang.msgErrorFunction(operation, error.message)
                );
            }

            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }

    async getByRelatedId(
        related_id: number,
        manager?: EntityManager
        ): Promise<ApiResponse<any | null>> {

        const response = new ApiResponse<any | null>();
        const operation = 'EventsService.getByRelatedId';

        try {

            if (!related_id) {
            return response.setIncomplete('related_id is required');
            }

            const orderRepo = manager
            ? manager.getRepository(Orders)
            : this.ordersRepository;

            const wrsRepo = manager
            ? manager.getRepository(WRS)
            : this.wrsRepository;

            const wrs = await wrsRepo.findOne({
            where: { wrs_id: related_id },
            });

            if (!wrs) {
            return response.setIncomplete('WRS not found');
            }

            if (wrs.wrs_status !== 'ERROR') {
            return response.setIncomplete('WRS is not in ERROR status');
            }

            const wrsCode = wrs.wrs_code;

            const rawOrders = await orderRepo
                .createQueryBuilder('o')

                .innerJoin(
                    WRS,
                    'w',
                    `
                    w.current_order_id = o.order_id
                    AND w.wrs_code = :wrsCode
                    AND w.current_order_id IS NOT NULL
                    `,
                    { wrsCode }
                )

                .leftJoin(StockItems, 's', 's.item_id = o.item_id')
                .leftJoin(OrdersUsage, 'ou', 'ou.order_id = o.order_id')

                .select([
                    'o.order_id AS order_id',
                    'o.mc_code AS mc_code',
                    'o.type AS type',
                    'o.item_id AS item_id',
                    's.stock_item AS stock_item',
                    'o.cond AS cond',
                    'o.plan_qty AS plan_qty',
                    'o.plan_qty AS actual_qty',
                    `
                    CASE 
                    WHEN o.type = 'USAGE' THEN ou.usage_num 
                    ELSE '-' 
                    END AS usage_num
                    `,
                    `
                    CASE 
                    WHEN o.type = 'USAGE' THEN ou.usage_line 
                    ELSE '-' 
                    END AS usage_line
                    `
                ])
                .getRawMany();

            if (!rawOrders || rawOrders.length === 0) {
            return response.setIncomplete('No ERROR orders found');
            }

            return response.setComplete(
            'Found ERROR orders',
            rawOrders
            );

        } catch (error: any) {

            console.error(`Error during ${operation}:`, error.message);

            if (error instanceof QueryFailedError) {
            return response.setIncomplete(
                `${operation} : ${error.message}`
            );
            }

            throw error;
        }
    }

    async getErrorAlert(
        storeType?: string,
        role?: string,
        manager?: EntityManager
    ): Promise<ApiResponse<any>> {

        const response = new ApiResponse<any>();
        const operation = 'EventsService.getErrorAlert';

        try {

            // ✅ ถ้า role ไม่ใช่ STORE ไม่ต้องแสดง error
            if (role !== 'STORE') {
                return response.setComplete('No error for this role', {
                    is_error: false,
                    sum_error: 0,
                    messages: []
                });
            }

            const repository = manager
                ? manager.getRepository(Events)
                : this.eventsRepository;

            const query = repository
                .createQueryBuilder('data')
                .select([
                    'data.store_type AS store_type',
                    'data.message AS message',
                    'data.level AS level'
                ])
                .where(`
                    (
                        (data.type = :typeError 
                            AND data.level = :levelError
                            AND data.status = :status
                            AND data.is_cleared = 0
                        )
                        OR
                        (
                            data.category = :categoryWarning
                            AND data.level = :levelWarning
                            AND data.created_at >= NOW() - INTERVAL 15 SECOND
                        )
                    )
                `)
                .setParameters({
                    typeError: 'ERROR',
                    levelError: 'ERROR',
                    status: 'ACTIVE',
                    categoryWarning: 'WARNING',
                    levelWarning: 'WARNING'
                });

            if (storeType) {
                query.andWhere('data.store_type = :storeType', { storeType });
            }

            const rawData = await query.getRawMany();

            const sum_error = rawData.length;

            const messages = rawData.map(row =>
                `${row.store_type} Store: ${row.message}`
            );

            const result = {
                is_error: sum_error > 0,
                sum_error,
                messages
            };

            return response.setComplete(
                lang.msgFound('events error data'),
                result
            );

        } catch (error: any) {

            console.error('Error in getErrorAlert:', error);

            if (error instanceof QueryFailedError) {
                return response.setIncomplete(
                    lang.msgErrorFunction(operation, error.message)
                );
            }

            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }
}