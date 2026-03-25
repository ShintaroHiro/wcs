import { EntityManager, QueryFailedError, Repository } from "typeorm";
import { ApiResponse } from "../models/api-response.model";
import * as lang from "../utils/LangHelper";
import { Orders } from "../entities/orders.entity";
import { AppDataSource } from "../config/app-data-source";
import { MRS } from "../entities/mrs.entity";
import { Aisle } from "../entities/aisle.entity";

export class BlockService {

    private aisleRepository : Repository<Aisle>;
    
    constructor(){
        this.aisleRepository = AppDataSource.getRepository(Aisle);
    }

    async getOrderAllBlockByUser(
        userId?: number,
        storeType?: string,
        manager?: EntityManager
    ): Promise<ApiResponse<any | null>> {

        const response = new ApiResponse<any | null>();
        const operation = 'BlockService.getOrderAllBlockByUser';

        try {
            const orderRepo = manager
                ? manager.getRepository(Orders)
                : AppDataSource.getRepository(Orders);

            const qb = orderRepo
                .createQueryBuilder('order')

                /* =======================
                * aisle
                * ======================= */
                .leftJoin(
                    Aisle,
                    'aisle',
                    'aisle.current_order_id = order.order_id'
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
                * s_events
                * ======================= */
                .leftJoin(
                    's_events',
                    'sev',
                    `
                        sev.order_id = order.order_id
                        AND sev.type = 'ERROR'
                        AND sev.category = 'MRS'
                        AND sev.status = 'ACTIVE'
                        AND sev.level = 'ERROR'
                        AND sev.is_cleared = 0
                    `
                )

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

                    /* phys location */
                    `COALESCE(fromLoc.box_loc, '-') AS phys_loc`,

                    /* aisle */
                    'aisle.aisle_id AS aisle_id',
                    `COALESCE(aisle.aisle_code, '-') AS aisle_code`,

                    /* s_events */
                    `COALESCE(sev.id, NULL) AS event_id`,

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
                            WHEN order.type = 'USAGE'
                                THEN usage.unit_cost_handled

                            WHEN order.type = 'RETURN'
                                THEN usage_ret.unit_cost_handled

                            WHEN order.type = 'RECEIPT'
                                THEN receipt.unit_cost_handled

                            WHEN order.type = 'TRANSFER'
                                THEN transfer.unit_cost_handled

                            ELSE NULL
                        END,
                        '-'
                    ) AS unit_cost_handled
                    `,
                    /* total cost */
                    `
                    COALESCE(
                        CASE
                            WHEN order.type = 'USAGE'
                                THEN (usage.unit_cost_handled * order.plan_qty)

                            WHEN order.type = 'RETURN'
                                THEN (usage_ret.unit_cost_handled * order.plan_qty)

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
                            THEN fromLoc.loc
                        ELSE NULL
                    END AS from_loc
                    `,
                    `
                    CASE
                        WHEN order.type = 'USAGE'
                            THEN fromLoc.box_loc
                        WHEN order.type = 'TRANSFER'
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
                                THEN toLoc.loc
                        ELSE NULL
                    END AS to_loc
                    `,
                    `
                    CASE
                        WHEN order.type IN ('RECEIPT','RETURN')
                            THEN fromLoc.box_loc
                        WHEN order.type = 'TRANSFER'
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
                    (
                        order.transfer_scenario NOT IN ('INTERNAL_OUT', 'INTERNAL_IN')
                        OR order.transfer_scenario IS NULL
                    )
                    AND order.status IN (:...statuses)
                )

            )
            `,
            {
                statuses: ['PROCESSING', 'QUEUE', 'ERROR'],
            }
            );

            /* filter user */
            if (userId) {
                qb.andWhere('order.executed_by_user_id = :userId', { userId });
            }
            /* filter store type */
            if (storeType) {
                qb.andWhere('order.store_type = :storeType', { storeType });
            }

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

                event_id: item.event_id ?? null,
                
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

    async getBlockAll(manager?: EntityManager): Promise<ApiResponse<any | null>> {
            const response = new ApiResponse<any | null>();
            const operation = 'BlockService.getBlockAll';
        
            try {
                const repository = manager ? manager.getRepository(Aisle) : this.aisleRepository;
        
                const rawData = await repository
                .createQueryBuilder('aisle')

                // 🔥 JOIN Orders
                .leftJoin(Orders, 'orders', 'orders.order_id = aisle.current_order_id')

                // 🔥 JOIN Stock Item
                .leftJoin('m_stock_items', 'stock', 'stock.item_id = orders.item_id')

                // 🔥 JOIN Location
                .leftJoin('m_location', 'loc', 'loc.loc_id = orders.loc_id')

                .select([
                    // aisle
                    'aisle.aisle_id AS aisle_id',
                    'aisle.aisle_code AS aisle_code',
                    'aisle.status AS status',
                    'aisle.current_order_id AS current_order_id',

                    // order
                    'orders.order_id AS order_id',
                    'orders.plan_qty AS plan_qty',
                    'orders.actual_qty AS actual_qty',

                    // stock item
                    'stock.stock_item AS stock_item',

                    // location
                    'loc.loc AS loc',
                    'loc.box_loc AS box_loc'
                ])

                .orderBy('aisle.aisle_id', 'ASC')

                .getRawMany();
        
                if (!rawData || rawData.length === 0) {
                    return response.setIncomplete(lang.msgNotFound('item.aisle'));
                }
        
                return response.setComplete(lang.msgFound('item.aisle'), rawData);
        
            } catch (error: any) {
                console.error('Error in get aisle all:', error);
        
                if (error instanceof QueryFailedError) {
                    return response.setIncomplete(lang.msgErrorFunction(operation, error.message));
                }
        
                throw new Error(lang.msgErrorFunction(operation, error.message));
            }
        }
}