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
                * stock & location
                * ======================= */
                .leftJoin('m_stock_items', 'stock', 'stock.item_id = order.item_id')
                .leftJoin('m_location', 'loc', 'loc.loc_id = order.loc_id')

                /* =======================
                * SELECT
                * ======================= */
                .select([
                    /* order */
                    'order.order_id AS order_id',
                    'order.type AS type',
                    'order.mc_code AS mc_code',
                    'order.cond AS cond',
                    'order.status AS status',
                    'order.plan_qty AS plan_qty',
                    'order.actual_qty AS actual_qty',
                    'order.item_id AS item_id',
                    'order.loc_id AS loc_id',
                    'order.requested_at AS requested_at',

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
                            ELSE NULL
                        END,
                        '-'
                    ) AS object_id
                    `,
                    `
                    COALESCE(
                        CASE
                            WHEN order.type = 'RECEIPT'
                                THEN receipt.unit_cost_handled
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
                            ELSE NULL
                        END,
                        '-'
                    ) AS total_cost_handled
                    `,

                    /* stock */
                    `COALESCE(stock.stock_item, '-') AS stock_item`,
                    `COALESCE(stock.item_desc, '-') AS item_desc`,

                    /* location */
                    `
                    COALESCE(
                        CASE
                            WHEN order.type = 'USAGE'
                                THEN loc.loc
                            ELSE NULL
                        END,
                        '-'
                    ) AS from_loc
                    `,
                    `
                    COALESCE(
                        CASE
                            WHEN order.type = 'USAGE'
                                THEN loc.box_loc
                            ELSE NULL
                        END,
                        '-'
                    ) AS from_box_loc
                    `,
                    `
                    COALESCE(
                        CASE
                            WHEN order.type IN ('RECEIPT','RETURN')
                                THEN loc.loc
                            ELSE NULL
                        END,
                        '-'
                    ) AS to_loc
                    `,
                    `
                    COALESCE(
                        CASE
                            WHEN order.type IN ('RECEIPT','RETURN')
                                THEN loc.box_loc
                            ELSE NULL
                        END,
                        '-'
                    ) AS to_box_loc
                    `,
                ])

                /* =======================
                * WHERE
                * ======================= */
                .where('order.status IN (:...statuses)', {
                    statuses: ['PROCESSING', 'QUEUE'],
                });

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

            return response.setComplete(
                lang.msgFound('field.orders'),
                rawData
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
                    'order.actual_qty AS actual',
                    'order.plan_qty AS plan',
                    'order.status AS order_status',
                ])
                .orderBy('counter.counter_id', 'ASC')
                .getRawMany();

            if (!rawData || rawData.length === 0) {
                return response.setIncomplete(lang.msgNotFound('counter'));
            }

            const cleanedData = rawData.map((item: any) => ({
                ...item,
                order_id: item.order_id ?? '-',
                actual: item.actual ?? 0,
                plan: item.plan ?? 0,
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
                    'counter.light_color_hex AS color',
                    'counter.light_mode AS light_mode',

                    // order
                    'order.order_id AS order_id',
                    'order.type AS trx_type',
                    'order.mc_code AS mc_code',
                    'order.plan_qty AS plan_qty',
                    'order.actual_qty AS actual_qty',
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

    
}