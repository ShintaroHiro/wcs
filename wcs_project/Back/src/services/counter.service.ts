import { EntityManager, QueryFailedError } from "typeorm";
import { ApiResponse } from "../models/api-response.model";
import * as lang from "../utils/LangHelper";
import { Orders } from "../entities/orders.entity";
import { AppDataSource } from "../config/app-data-source";
import { Counter } from "../entities/counter.entity";
import { StatusOrders } from "../common/global.enum";
import { OrdersUsage } from "../entities/order_usage.entity";
import { StockItems } from "../entities/m_stock_items.entity";
import { OrdersReceipt } from "../entities/order_receipt.entity";
import { OrdersTransfer } from "../entities/order_transfer.entity";
import { OrdersReturn } from "../entities/order_return.entity";
import { CounterRuntime } from "../entities/counter_runtime.entity";

export class CounterService {

    async getOrderAllByUser(
        userId?: number,
        manager?: EntityManager
    ): Promise<ApiResponse<any | null>> {

        const response = new ApiResponse<any | null>();
        const operation = 'OrderService.getOrderAllByUser';

        try {
            const orderRepo = manager
                ? manager.getRepository(Orders)
                : AppDataSource.getRepository(Orders);

            const qb = orderRepo
                .createQueryBuilder('order')

                /* =======================
                * counter
                * ======================= */
                .leftJoin(
                    Counter,
                    'counter',
                    'counter.current_order_id = order.order_id'
                )

                /* =======================
                * USAGE
                * ======================= */
                .leftJoin(
                    'orders_usage',
                    'usage',
                    'usage.order_id = order.order_id AND order.type = \'USAGE\''
                )

                /* =======================
                * RECEIPT
                * ======================= */
                .leftJoin(
                    'orders_receipt',
                    'receipt',
                    'receipt.order_id = order.order_id AND order.type = \'RECEIPT\''
                )

                /* =======================
                * RETURN → usage เดิม
                * ======================= */
                .leftJoin(
                    'orders_return',
                    'ret',
                    'ret.order_id = order.order_id AND order.type = \'RETURN\''
                )
                .leftJoin(
                    'orders_usage',
                    'usage_ret',
                    'usage_ret.usage_id = ret.usage_id'
                )

                /* =======================
                * TRANSFER
                * ======================= */
                .leftJoin(
                    'orders_transfer',
                    'transfer',
                    `transfer.order_id = order.order_id AND order.type = 'TRANSFER'`
                )

                /* from = order.loc_id */
                .leftJoin('m_location', 'fromLoc', 'fromLoc.loc_id = order.loc_id')

                /* to = transfer.related_loc_id */
                .leftJoin(
                    'm_location',
                    'toLoc',
                    'toLoc.loc_id = transfer.related_loc_id'
                )

                /* =======================
                * stock
                * ======================= */
                .leftJoin('m_stock_items', 'stock', 'stock.item_id = order.item_id')

                /* =======================
                * SELECT
                * ======================= */
                .select([
                    /* order */
                    'order.order_id AS order_id',
                    'order.type AS type',
                    'order.mc_code AS mc_code',
                    'order.cond AS cond',
                    'order.plan_qty AS plan_qty',
                    'order.actual_qty AS actual_qty',
                    'order.item_id AS item_id',
                    'order.loc_id AS loc_id',
                    'order.requested_at AS requested_at',
                    'order.transfer_scenario AS transfer_scenario',

                    /* counter */
                    `COALESCE(counter.counter_id, '-') AS counter_id`,
                    `COALESCE(counter.light_color_hex, '-') AS counter_color`,

                    /* USAGE / RETURN */
                    `
                    COALESCE(
                        CASE
                            WHEN order.type = 'USAGE'
                                THEN usage.work_order
                            WHEN order.type = 'RETURN'
                                THEN usage_ret.work_order
                            ELSE NULL
                        END,
                        '-'
                    ) AS work_order
                    `,
                    `
                    COALESCE(
                        CASE
                            WHEN order.type = 'USAGE'
                                THEN usage.spr_no
                            WHEN order.type = 'RETURN'
                                THEN usage_ret.spr_no
                            ELSE NULL
                        END,
                        '-'
                    ) AS spr_no
                    `,
                    `
                    COALESCE(
                        CASE
                            WHEN order.type = 'USAGE'
                                THEN usage.usage_num
                            WHEN order.type = 'RETURN'
                                THEN usage_ret.usage_num
                            ELSE NULL
                        END,
                        '-'
                    ) AS usage_num
                    `,
                    `
                    COALESCE(
                        CASE
                            WHEN order.type = 'USAGE'
                                THEN usage.usage_line
                            WHEN order.type = 'RETURN'
                                THEN usage_ret.usage_line
                            ELSE NULL
                        END,
                        '-'
                    ) AS usage_line
                    `,

                    /* RECEIPT */
                    `
                    COALESCE(
                        CASE
                            WHEN order.type = 'RECEIPT'
                                THEN receipt.po_num
                            ELSE NULL
                        END,
                        '-'
                    ) AS po_num
                    `,
                    `
                    COALESCE(
                        CASE
                            WHEN order.type = 'RECEIPT'
                                THEN receipt.object_id
                            WHEN order.type = 'TRANSFER'
                                THEN transfer.object_id
                            ELSE NULL
                        END,
                        '-'
                    ) AS object_id
                    `,
                    /* unit cost */
                    `
                    COALESCE(
                        CASE
                            WHEN order.type = 'RECEIPT'
                                THEN receipt.unit_cost_handled
                            WHEN order.type = 'TRANSFER'
                                THEN transfer.unit_cost_handled
                            ELSE NULL
                        END,
                        '-'
                    ) AS unit_cost_handled
                    `,
                    `
                    COALESCE(
                        CASE
                            WHEN order.type = 'RECEIPT'
                                THEN (receipt.unit_cost_handled * order.plan_qty)
                            WHEN order.type = 'TRANSFER'
                                THEN (transfer.unit_cost_handled * order.plan_qty)
                            ELSE NULL
                        END,
                        '-'
                    ) AS total_cost_handled
                    `,

                    /* transfer */
                    `
                    CASE
                        WHEN order.type = 'TRANSFER'
                            AND order.transfer_scenario = 'INTERNAL_OUT'
                            THEN transfer.transfer_status
                        ELSE order.status
                    END AS status
                    `,

                    /* stock */
                    `COALESCE(stock.stock_item, '-') AS stock_item`,
                    `COALESCE(stock.item_desc, '-') AS item_desc`,

                    /* =======================
                    * location (UPDATED)
                    * ======================= */

                    /* ---------- FROM ---------- */
                    `
                    CASE
                        WHEN order.type = 'USAGE'
                            THEN fromLoc.loc

                        WHEN order.type = 'TRANSFER'
                            AND order.transfer_scenario IN ('OUTBOUND','INTERNAL_OUT','INTERNAL_IN')
                            THEN fromLoc.loc

                        ELSE NULL
                    END AS from_loc
                    `,
                    `
                    CASE
                        WHEN order.type = 'USAGE'
                            THEN fromLoc.box_loc

                        WHEN order.type = 'TRANSFER'
                            AND order.transfer_scenario IN ('OUTBOUND','INTERNAL_OUT','INTERNAL_IN')
                            THEN fromLoc.box_loc

                        ELSE NULL
                    END AS from_box_loc
                    `,

                    /* ---------- TO ---------- */
                    `
                    CASE
                        WHEN order.type IN ('RECEIPT','RETURN')
                            THEN fromLoc.loc

                        WHEN order.type = 'TRANSFER'
                            AND order.transfer_scenario IN ('INBOUND','INTERNAL_OUT','INTERNAL_IN')
                            THEN toLoc.loc

                        ELSE NULL
                    END AS to_loc
                    `,
                    `
                    CASE
                        WHEN order.type IN ('RECEIPT','RETURN')
                            THEN fromLoc.box_loc

                        WHEN order.type = 'TRANSFER'
                            AND order.transfer_scenario IN ('INBOUND','INTERNAL_OUT','INTERNAL_IN')
                            THEN toLoc.box_loc

                        ELSE NULL
                    END AS to_box_loc
                    `,
                    
                ])

                /* =======================
                * WHERE
                * ======================= */
  .where(
`
(
    -- 1) INTERNAL_OUT (ยกเว้น PICK_SUCCESS)
    (
        order.type = 'TRANSFER'
        AND order.transfer_scenario = 'INTERNAL_OUT'
        AND transfer.transfer_status IN (:...statuses)
        AND transfer.transfer_status != 'PICK_SUCCESS'
    )

    OR

    -- 2) INTERNAL_IN ที่มาจาก INTERNAL_OUT PICK_SUCCESS
    (
        order.type = 'TRANSFER'
        AND order.transfer_scenario = 'INTERNAL_IN'
        AND order.status IN (:...statuses)
        AND EXISTS (
            SELECT 1
            FROM orders o2
            LEFT JOIN orders_transfer t2 ON t2.order_id = o2.order_id
            WHERE 
                o2.transfer_scenario = 'INTERNAL_OUT'
                AND t2.related_order_id = order.order_id
                AND t2.transfer_status = 'PICK_SUCCESS'
        )
    )

    OR

    -- 3) Order อื่น ๆ
    (
        order.transfer_scenario NOT IN ('INTERNAL_OUT', 'INTERNAL_IN')
        AND order.status IN (:...statuses)
    )
)
`,
{
    statuses: ['PROCESSING', 'QUEUE'],
}
);



            /* filter user */
            if (userId) {
                qb.andWhere('order.executed_by_user_id = :userId', { userId });
            }

            /* =======================
            * ORDER BY
            * ======================= */
            qb.orderBy(
                'CASE WHEN counter.counter_id IS NOT NULL THEN 0 ELSE 1 END',
                'ASC'
            )
            .addOrderBy('order.requested_at', 'ASC');

            const rawData = await qb.getRawMany();

            if (!rawData || rawData.length === 0) {
                return response.setIncomplete(lang.msgNotFound('field.orders'));
            }

            const cleanedData = rawData.map(item => ({
                ...item,

                from_loc: item.from_loc ?? '-',
                from_box_loc: item.from_box_loc ?? '-',
                to_loc: item.to_loc ?? '-',
                to_box_loc: item.to_box_loc ?? '-',

                work_order: item.work_order ?? '-',
                spr_no: item.spr_no ?? '-',
                usage_num: item.usage_num ?? '-',
                usage_line: item.usage_line ?? '-',

                counter_id: item.counter_id ?? '-',
                counter_color: item.counter_color ?? '-',

                plan_qty: Number(item.plan_qty || 0),
                actual_qty: Number(item.actual_qty || 0),
            }));


            return response.setComplete(
                lang.msgFound('field.orders'),
                cleanedData
            );

        } catch (error: any) {
            console.error(`Error during ${operation}:`, error);

            if (error instanceof QueryFailedError) {
                return response.setIncomplete(
                    lang.msgErrorFunction(operation, error.message)
                );
            }

            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }

    async getCounterAllByUser(
        userId?: number,
        manager?: EntityManager
    ): Promise<ApiResponse<any | null>> {

        const response = new ApiResponse<any | null>();
        const operation = 'CounterService.getCounterAllByUser';

        try {
            const repository = manager
                ? manager.getRepository(Counter)
                : AppDataSource.getRepository(Counter);

            const qb = repository
                .createQueryBuilder('counter')
                .leftJoin(
                    CounterRuntime,
                    'runtime',
                    'runtime.counter_id = counter.counter_id'
                )
                .leftJoin(
                    Orders,
                    'order',
                    'order.order_id = counter.current_order_id'
                );

            // ✅ filter เฉพาะ REQUESTER
            if (userId) {
                qb.andWhere('order.executed_by_user_id = :userId', { userId });
            }

            const rawData = await qb
                .select([
                    'counter.counter_id AS id',
                    'counter.status AS status',
                    'counter.light_color_hex AS color',
                    'order.order_id AS order_id',
                    'runtime.actual_qty AS actual_qty',
                    'order.plan_qty AS plan_qty',
                    'order.status AS order_status',
                ])
                .orderBy('counter.counter_id', 'ASC')
                .getRawMany();

            if (!rawData || rawData.length === 0) {
                return response.setIncomplete(lang.msgNotFound('counter'));
            }

            const cleanedData = rawData.map((item: any) => ({
                id: Number(item.id),
                status: item.status,
                color: item.color,

                order_id: item.order_id ?? null,
                actual_qty: Number(item.actual_qty || 0),
                plan_qty: Number(item.plan_qty || 0),
            }));


            return response.setComplete(lang.msgFound('counter'), cleanedData);

        } catch (error: any) {
            console.error('Error in getCounterAllByUser:', error);

            if (error instanceof QueryFailedError) {
                return response.setIncomplete(
                    lang.msgErrorFunction(operation, error.message)
                );
            }

            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }

    async getByCounterId(
        counterId: number,
        manager?: EntityManager
    ): Promise<ApiResponse<any[] | null>> {

        const response = new ApiResponse<any[] | null>();
        const operation = 'CounterService.getByCounterId';

        try {
            const counterRepo = manager
                ? manager.getRepository(Counter)
                : AppDataSource.getRepository(Counter);

            const rawData = await counterRepo
                .createQueryBuilder('counter')

                .leftJoin(
                    Orders,
                    'order',
                    'order.order_id = counter.current_order_id'
                )

                //เอา actual จาก counter runtime
                .leftJoin(
                    CounterRuntime,
                    'runtime',
                    'runtime.counter_id = counter.counter_id'
                )

                // ===== USAGE (ตรง) =====
                .leftJoin(
                    OrdersUsage,
                    'usage',
                    'usage.order_id = order.order_id AND order.type = \'USAGE\''
                )

                // ===== RETURN (เอา usage_id มาก่อน) =====
                .leftJoin(
                    OrdersReturn,
                    'ret',
                    'ret.order_id = order.order_id AND order.type = \'RETURN\''
                )

                // ===== RETURN → join usage อีกครั้ง =====
                .leftJoin(
                    OrdersUsage,
                    'usage_ret',
                    'usage_ret.usage_id = ret.usage_id'
                )

                // ===== RECEIPT =====
                .leftJoin(
                    OrdersReceipt,
                    'receipt',
                    "receipt.order_id = order.order_id AND order.type = 'RECEIPT'"
                )

                // ===== TRANSFER =====
                .leftJoin(
                    OrdersTransfer,
                    'transfer',
                    "transfer.order_id = order.order_id AND order.type = 'TRANSFER'"
                )

                // ===== ITEM =====
                .leftJoin(
                    StockItems,
                    'item',
                    'item.item_id = order.item_id'
                )

                .select([
                    // counter
                    'counter.counter_id AS counter_id',
                    'counter.status AS status',
                    'counter.light_color_hex AS color',
                    'counter.light_mode AS light_mode',

                    // order
                    'order.order_id AS order_id',
                    'order.type AS trx_type',
                    'order.mc_code AS mc_code',
                    'order.plan_qty AS plan_qty',
                    'COALESCE(runtime.actual_qty, 0) AS actual_qty',
                    'order.item_id AS item_id',

                    // ⭐ USAGE / RETURN (ใช้ CASE)
                    `
                    CASE
                        WHEN order.type = 'USAGE'
                            THEN usage.work_order
                        WHEN order.type = 'RETURN'
                            THEN usage_ret.work_order
                        ELSE NULL
                    END AS work_order
                    `,

                    `
                    CASE
                        WHEN order.type = 'USAGE'
                            THEN usage.usage_num
                        WHEN order.type = 'RETURN'
                            THEN usage_ret.usage_num
                        ELSE NULL
                    END AS usage_num
                    `,

                    `
                    CASE
                        WHEN order.type = 'USAGE'
                            THEN usage.spr_no
                        WHEN order.type = 'RETURN'
                            THEN usage_ret.spr_no
                        ELSE NULL
                    END AS spr_no
                    `,

                    `
                    CASE
                        WHEN order.type = 'USAGE'
                            THEN usage.usage_line
                        WHEN order.type = 'RETURN'
                            THEN usage_ret.usage_line
                        ELSE NULL
                    END AS usage_line
                    `,

                    // RECEIPT
                    'receipt.po_num AS po_num',
                    'receipt.object_id AS receipt_object_id',

                    // TRANSFER
                    'transfer.object_id AS transfer_object_id',

                    // item
                    'item.stock_item AS stock_item',
                    'item.item_desc AS item_desc',
                    'item.item_img AS item_img',
                    'item.item_img_url AS item_img_url',
                ])
                .where('counter.counter_id = :counterId', { counterId })
                .getRawMany();

            if (!rawData || rawData.length === 0) {
                return response.setIncomplete(lang.msgNotFound('counter'));
            }

            const flattenedData = rawData.map((row) => {
                const isUsageOrReturn =
                    row.trx_type === 'USAGE' || row.trx_type === 'RETURN';

                const isReceipt = row.trx_type === 'RECEIPT';
                const isTransfer = row.trx_type === 'TRANSFER';

                return {
                    // counter
                    counter_id: row.counter_id,
                    status: row.status,
                    color: row.color,
                    light_mode: row.light_mode,

                    // order
                    order_id: row.order_id,
                    trx_type: row.trx_type,
                    mc_code: row.mc_code,
                    plan_qty: row.plan_qty,
                    actual_qty: row.actual_qty,

                    // ⭐ USAGE / RETURN
                    work_order: isUsageOrReturn ? row.work_order : null,
                    usage_num: isUsageOrReturn ? row.usage_num : null,
                    spr_no: isUsageOrReturn ? row.spr_no : null,
                    usage_line: isUsageOrReturn ? row.usage_line : null,

                    // RECEIPT
                    po_num: row.po_num,

                    // RECEIPT / TRANSFER
                    object_id: isReceipt
                        ? row.receipt_object_id
                        : isTransfer
                        ? row.transfer_object_id
                        : null,

                    // item
                    item_id: row.item_id,
                    stock_item: row.stock_item,
                    item_desc: row.item_desc,
                    item_img: row.item_img,
                    item_img_url: row.item_img_url,
                };
            });

            return response.setComplete(lang.msgFound('counter'), flattenedData);

        } catch (error: any) {
            console.error(`Error during ${operation}:`, error.message);

            if (error instanceof QueryFailedError) {
                return response.setIncomplete(
                    lang.msgErrorFunction(operation, error.message)
                );
            }

            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }

    async counterChangeStatus(
        dto: {
            order_id: number;
            status: 'EMPTY' | 'WAITING_AMR' | 'READY_TO_PICK' | 'ERROR' | 'WAITING_PICK';
        },
        reqUsername: string,
        manager?: EntityManager
    ): Promise<ApiResponse<any>> {

        const response = new ApiResponse<any>();

        if (!dto?.order_id || !dto?.status) {
            return response.setIncomplete("order_id and status are required");
        }

        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager || queryRunner?.manager;

        if (!useManager) {
            return response.setIncomplete("No entity manager available");
        }

        if (!manager && queryRunner) {
            await queryRunner.connect();
            await queryRunner.startTransaction();
        }

        try {

            const transferRepo = useManager.getRepository(OrdersTransfer);
            const counterRepo = useManager.getRepository(Counter);

            // 🔎 หา transfer
            const transfer = await transferRepo.findOne({
                where: { order_id: dto.order_id },
            });

            // ❗ ไม่เจอ → จบเลย
            if (!transfer?.related_order_id) {

                if (!manager && queryRunner) {
                    await queryRunner.commitTransaction();
                }

                return response.setComplete("No action needed",{});
            }

            // 🔎 หา counter
            const counter = await counterRepo.findOne({
                where: { current_order_id: transfer.related_order_id },
            });

            // ❗ ไม่เจอ → จบเลย
            if (!counter) {

                if (!manager && queryRunner) {
                    await queryRunner.commitTransaction();
                }

                return response.setComplete("No action needed",{});
            }

            // 🔥 update
            await counterRepo.update(
                { counter_id: counter.counter_id },
                {
                    status: dto.status,
                    last_event_at: new Date(),
                }
            );

            if (!manager && queryRunner) {
                await queryRunner.commitTransaction();
            }

            return response.setComplete("Status updated",{});

        } catch (error: any) {

            if (!manager && queryRunner) {
                await queryRunner.rollbackTransaction();
            }

            return response.setIncomplete(error.message);

        } finally {

            if (!manager && queryRunner) {
                await queryRunner.release();
            }
        }
    }


}