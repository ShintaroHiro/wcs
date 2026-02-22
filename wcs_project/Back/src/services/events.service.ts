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
import { ControlSource, StatusOrders } from '../common/global.enum';
import { OrdersLogService } from '../utils/logTaskEvent';
import { EventService } from '../utils/EventService';
import { WrsLogService } from '../utils/LogWrsService';

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

            /* 1️⃣ LOCK ORDER */
            const order = await ordersRepo.findOne({
                where: { order_id },
                lock: { mode: "pessimistic_write" }
            });

            if (!order)
            throw new Error("Order not found");

            if (order.status === StatusOrders.ERROR)
            throw new Error("Order already ERROR");

            /* 2️⃣ UPDATE ORDER */
            order.status = StatusOrders.ERROR;
            await ordersRepo.save(order);

            /* 3️⃣ INSERT ORDER LOG */
            await logService.logTaskEvent(
                useManager,
                order,
                {
                    actor: reqUsername,
                    status: StatusOrders.ERROR,
                }
            );

            /* 4️⃣ FIND WRS BY current_order_id */
            const wrs = await wrsRepo.findOne({
                where: { current_order_id: order_id },
                lock: { mode: "pessimistic_write" }
            });

            if (!wrs)
            throw new Error("WRS not found for this order");

            const wrsId = wrs.wrs_id;

            /* 5️⃣ INSERT EVENT */
            await eventRepo.insert({
                type: "ERROR",
                category: "WRS",
                event_code: "AMR_ERROR",
                message: `AMR-${wrs.wrs_code} Error`,   // ถ้ามี wrs_code
                related_id: wrsId,                     // 👈 สำคัญ
                level: "ERROR",
                status: "ACTIVE",
                created_at: new Date(),
                created_by: "SYSTEM AMR",
                is_cleared: false
            });

            /* 6️⃣ UPDATE WRS STATUS */
            if (wrs.wrs_status !== 'ERROR') {
                wrs.wrs_status = 'ERROR';
                await wrsRepo.save(wrs);
            }

            /* 6.1 INSERT WRS LOG */
            await wrsLogService.createLog(useManager, {
                wrs_id: wrs.wrs_id,
                order_id: order.order_id,
                status: 'ERROR',
                operator: ControlSource.MANUAL,
                event: 'Order Error',
                message: `Order ${order.order_id} Error by AMR ${wrs.wrs_code}`
            });

            /* 7 UPDATE COUNTER */
            const counter = await counterRepo.findOne({
                where: { current_order_id: order_id },
                lock: { mode: "pessimistic_write" }
            });

            if (counter) {
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

        // /* POST COMMIT */
        // try {
        //     if (counterId) {
        //     broadcast(counterId, {
        //         counter_id: counterId,
        //         status: "ERROR"
        //     });
        //     }
        // } catch (e) {
        //     console.error("Broadcast error:", e);
        // }

        return response.setComplete("Order set to ERROR", { order_id });
    }


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
}