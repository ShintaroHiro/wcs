import { Repository, EntityManager, Not, QueryFailedError } from 'typeorm';
import { AppDataSource } from '../config/app-data-source';
import { ApiResponse } from '../models/api-response.model';
import * as lang from '../utils/LangHelper'; // Import LangHelper for specific functions
import { Orders } from '../entities/orders.entity';
import { StatusOrders, TypeInfm } from '../common/global.enum';

export class AllOrdersService {
    private ordersRepository: Repository<Orders>;

    constructor(){
        this.ordersRepository = AppDataSource.getRepository(Orders);
    }

    async getUsageAll(
        options?: {
            isExecution?: boolean;   // ✅ true = status Waiting / false = all status except FINISHED/COMPLETED
            store_type?: string;
            mc_code?: string;
        },
        manager?: EntityManager
        ): Promise<ApiResponse<any | null>> {
    
        const response = new ApiResponse<any | null>();
        const operation = 'AllOrdersService.getUsageAll';

        try {
            const repository = manager
                ? manager.getRepository(Orders)
                : this.ordersRepository;

            const query = repository
                .createQueryBuilder('order')
                .leftJoin('orders_usage', 'usage', 'usage.order_id = order.order_id')

                // 🔗 เพิ่ม join ตาม flow
                // .leftJoin('inventory', 'inv', 'inv.inv_id = usage.inv_id')
                // .leftJoin('orders_receipt', 'receipt', 'receipt.receipt_id = inv.receipt_id')

                .leftJoin('m_stock_items', 'stock', 'stock.item_id = order.item_id')
                .leftJoin('m_location', 'loc', 'loc.loc_id = order.loc_id')
                .select([
                    'order.order_id AS order_id',
                    'order.mc_code AS mc_code',
                    'order.type AS type',
                    'order.status AS status',

                    'usage.usage_id AS usage_id',
                    'usage.work_order AS work_order',
                    'usage.spr_no AS spr_no',
                    'usage.usage_num AS usage_num',
                    'usage.usage_line AS usage_line',
                    'usage.usage_type AS usage_type',
                    'usage.split AS split',

                    'stock.item_id AS item_id',
                    'stock.stock_item AS stock_item',
                    'stock.item_desc AS item_desc',

                    'loc.loc_id AS loc_id',
                    'loc.loc AS loc',
                    'loc.box_loc AS box_loc',

                    'order.store_type AS store_type',
                    'order.cond AS cond',
                    'order.plan_qty AS plan_qty',
                    'order.actual_qty AS actual_qty',
                    'order.requested_by AS requested_by',
                    "DATE_FORMAT(order.requested_at, '%d/%m/%Y') AS requested_at",

                    // // 💰 cost จาก receipt
                    // 'receipt.unit_cost_handled AS unit_cost_handled',

                    // // 💰 total cost
                    // '(IFNULL(receipt.unit_cost_handled,0) * IFNULL(order.plan_qty,0)) AS total_cost_handled',

                ])
                .where('order.type = :type', { type: 'USAGE' })
                .orderBy('order.requested_at', 'ASC')
                .cache(false);

            // 🔥 true = status Waiting / false = all status except FINISHED/COMPLETED / undefined = all status
            if (options?.isExecution === true) {
                    // เฉพาะ WAITING
                    query.andWhere('order.status = :waitingStatus', {
                        waitingStatus: StatusOrders.WAITING,
                    });
                } else if (options?.isExecution === false) {
                    // ทุกสถานะ ยกเว้น WAITING และ FINISHED/COMPLETED
                    query.andWhere('order.status NOT IN (:...excludedStatuses)', {
                        excludedStatuses: [
                            StatusOrders.WAITING,
                            StatusOrders.FINISHED,
                            StatusOrders.COMPLETED
                        ],
                    });
                }
                // undefined → ไม่ใส่ where (ได้ทุกสถานะ)

            // 🔎 filter store_type
            if (options?.store_type) {
                query.andWhere('order.store_type = :store_type', {
                    store_type: options.store_type,
                });
            }

            // 🔎 filter mc_code
            if (options?.mc_code) {
                query.andWhere('order.mc_code = :mc_code', {
                    mc_code: options.mc_code,
                });
            }

            const rawData = await query.getRawMany();

            if (!rawData || rawData.length === 0) {
                return response.setIncomplete(lang.msgNotFound('field.usage'));
            }

            // ✅ normalize ค่าเหมือนเดิม
            const cleanedData = rawData.map((item: any) => ({
                ...item,
                actual_qty:
                    item.actual_qty != null && !isNaN(Number(item.actual_qty))
                        ? Number(item.actual_qty)
                        : 0,

                plan_qty:
                    item.plan_qty != null && !isNaN(Number(item.plan_qty))
                        ? Number(item.plan_qty)
                        : 0,

                unit_cost_handled:
                    item.unit_cost_handled != null && !isNaN(Number(item.unit_cost_handled))
                        ? Number(item.unit_cost_handled)
                        : 0,

                total_cost_handled:
                    item.total_cost_handled != null && !isNaN(Number(item.total_cost_handled))
                        ? Number(item.total_cost_handled)
                        : 0,
            }));

            return response.setComplete(lang.msgFound('field.usage'), cleanedData);

        } catch (error: any) {
            console.error(`Error in ${operation}:`, error);

            if (error instanceof QueryFailedError) {
                return response.setIncomplete(
                    lang.msgErrorFunction(operation, error.message)
                );
            }

            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }

    async getReceiptAll(
        options?: {
            isExecution?: boolean;   // ✅ true = status Waiting / false = all status except FINISHED/COMPLETED
            store_type?: string;
            mc_code?: string;
        },
        manager?: EntityManager
        ): Promise<ApiResponse<any | null>> {
    
        const response = new ApiResponse<any | null>();
        const operation = 'AllOrdersService.getReceiptAll';

        try {
            const repository = manager
                ? manager.getRepository(Orders)
                : this.ordersRepository;

            const query = repository
                .createQueryBuilder('order')
                .leftJoin('orders_receipt', 'receipt', 'receipt.order_id = order.order_id')
                .leftJoin('m_stock_items', 'stock', 'stock.item_id = order.item_id')
                .leftJoin('m_location', 'loc', 'loc.loc_id = order.loc_id')
                .select([
                    'order.order_id AS order_id',
                    'order.mc_code AS mc_code',
                    'order.type AS type',
                    'order.status AS status',

                    'receipt.receipt_id AS receipt_id',
                    'receipt.po_num AS po_num',
                    'receipt.object_id AS object_id',
                    'receipt.contract_num AS contract_num',
                    'receipt.unit_cost_handled AS unit_cost_handled',          // ✅ เพิ่ม

                    'stock.item_id AS item_id',
                    'stock.stock_item AS stock_item',
                    'stock.item_desc AS item_desc',

                    'loc.loc_id AS loc_id',
                    'loc.loc AS loc',
                    'loc.box_loc AS box_loc',

                    'order.store_type AS store_type',
                    'order.cond AS cond',
                    'order.plan_qty AS plan_qty',
                    'order.actual_qty AS actual_qty',

                    // ✅ คำนวณ total_cost_handled
                    '(IFNULL(receipt.unit_cost_handled,0) * IFNULL(order.plan_qty,0)) AS total_cost_handled',

                    'order.requested_by AS requested_by',
                    "DATE_FORMAT(order.requested_at, '%d/%m/%Y') AS requested_at",
                ])

                // 🔒 base condition
                .where('order.type = :type', { type: 'RECEIPT' })
                .orderBy('order.requested_at', 'ASC')
                .cache(false);

            // 🔥 true = status Waiting / false = all status except FINISHED/COMPLETED / undefined = all status
            if (options?.isExecution === true) {
                    // เฉพาะ WAITING
                    query.andWhere('order.status = :waitingStatus', {
                        waitingStatus: StatusOrders.WAITING,
                    });
                } else if (options?.isExecution === false) {
                    // ทุกสถานะ ยกเว้น WAITING และ FINISHED/COMPLETED
                    query.andWhere('order.status NOT IN (:...excludedStatuses)', {
                        excludedStatuses: [
                            StatusOrders.WAITING,
                            StatusOrders.FINISHED,
                            StatusOrders.COMPLETED
                        ],
                    });
                }
                // undefined → ไม่ใส่ where (ได้ทุกสถานะ)

            // 🔎 filter store_type
            if (options?.store_type) {
                query.andWhere('order.store_type = :store_type', {
                    store_type: options.store_type,
                });
            }

            // 🔎 filter mc_code
            if (options?.mc_code) {
                query.andWhere('order.mc_code = :mc_code', {
                    mc_code: options.mc_code,
                });
            }

            const rawData = await query.getRawMany();

            if (!rawData || rawData.length === 0) {
                return response.setIncomplete(lang.msgNotFound('field.receipt'));
            }

            // ✅ normalize ค่าเหมือนเดิม
            const cleanedData = rawData.map((item: any) => ({
                ...item,
                actual_qty:
                    item.actual_qty != null && !isNaN(Number(item.actual_qty))
                        ? Number(item.actual_qty)
                        : 0,

                plan_qty:
                    item.plan_qty != null && !isNaN(Number(item.plan_qty))
                        ? Number(item.plan_qty)
                        : 0,

                unit_cost_handled:
                    item.unit_cost_handled != null && !isNaN(Number(item.unit_cost_handled))
                        ? Number(item.unit_cost_handled)
                        : 0,

                total_cost_handled:
                    item.total_cost_handled != null && !isNaN(Number(item.total_cost_handled))
                        ? Number(item.total_cost_handled)
                        : 0,
            }));

            return response.setComplete(lang.msgFound('field.receipt'), cleanedData);

        } catch (error: any) {
            console.error(`Error in ${operation}:`, error);

            if (error instanceof QueryFailedError) {
                return response.setIncomplete(
                    lang.msgErrorFunction(operation, error.message)
                );
            }

            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }

    async getReturnAll(
        options?: {
            isExecution?: boolean;   // ✅ true = status Waiting / false = all status except FINISHED/COMPLETED
            store_type?: string;
            mc_code?: string;
        },
        manager?: EntityManager
        ): Promise<ApiResponse<any | null>> {
    
        const response = new ApiResponse<any | null>();
        const operation = 'AllOrdersService.getReturnAll';

        try {
            const repository = manager
                ? manager.getRepository(Orders)
                : this.ordersRepository;

            const query = repository
                .createQueryBuilder('order')
                .leftJoin('orders_return', 'ret', 'ret.order_id = order.order_id')
                .leftJoin('orders_usage', 'usage', 'usage.usage_id = ret.usage_id')

                // // 🔗 usage → inventory
                // .leftJoin('inventory', 'inv', 'inv.inv_id = usage.inv_id')

                // // 🔗 inventory → receipt
                // .leftJoin('orders_receipt', 'receipt', 'receipt.receipt_id = inv.receipt_id')

                .leftJoin('m_stock_items', 'stock', 'stock.item_id = order.item_id')
                .leftJoin('m_location', 'loc', 'loc.loc_id = order.loc_id')

                .select([
                    'order.order_id AS order_id',
                    'order.mc_code AS mc_code',
                    'order.type AS type',
                    'order.status AS status',

                    'usage.usage_id AS usage_id',
                    'usage.work_order AS work_order',
                    'usage.spr_no AS spr_no',
                    'usage.usage_num AS usage_num',
                    'usage.usage_line AS usage_line',

                    'stock.item_id AS item_id',
                    'stock.stock_item AS stock_item',
                    'stock.item_desc AS item_desc',

                    'loc.loc_id AS loc_id',
                    'loc.loc AS loc',
                    'loc.box_loc AS box_loc',

                    'order.store_type AS store_type',
                    'order.cond AS cond',
                    'order.plan_qty AS plan_qty',
                    'order.actual_qty AS actual_qty',

                    // // 💰 cost จาก receipt
                    // 'receipt.unit_cost_handled AS unit_cost_handled',

                    // // 💰 total cost
                    // '(IFNULL(receipt.unit_cost_handled,0) * IFNULL(order.plan_qty,0)) AS total_cost_handled',

                    'order.requested_by AS requested_by',
                    "DATE_FORMAT(order.requested_at, '%d/%m/%Y') AS requested_at",
                ])
                .where('order.type = :type', { type: 'RETURN' })
                .orderBy('order.requested_at', 'ASC')
                .cache(false);

            // 🔥 true = status Waiting / false = all status except FINISHED/COMPLETED / undefined = all status
            if (options?.isExecution === true) {
                    // เฉพาะ WAITING
                    query.andWhere('order.status = :waitingStatus', {
                        waitingStatus: StatusOrders.WAITING,
                    });
                } else if (options?.isExecution === false) {
                    // ทุกสถานะ ยกเว้น WAITING และ FINISHED/COMPLETED
                    query.andWhere('order.status NOT IN (:...excludedStatuses)', {
                        excludedStatuses: [
                            StatusOrders.WAITING,
                            StatusOrders.FINISHED,
                            StatusOrders.COMPLETED
                        ],
                    });
                }
                // undefined → ไม่ใส่ where (ได้ทุกสถานะ)

            // 🔎 filter store_type
            if (options?.store_type) {
                query.andWhere('order.store_type = :store_type', {
                    store_type: options.store_type,
                });
            }

            // 🔎 filter mc_code
            if (options?.mc_code) {
                query.andWhere('order.mc_code = :mc_code', {
                    mc_code: options.mc_code,
                });
            }

            const rawData = await query.getRawMany();

            if (!rawData || rawData.length === 0) {
                return response.setIncomplete(lang.msgNotFound('field.return'));
            }

            // ✅ normalize ค่าเหมือนเดิม
            const cleanedData = rawData.map((item: any) => ({
                ...item,
                actual_qty:
                    item.actual_qty != null && !isNaN(Number(item.actual_qty))
                        ? Number(item.actual_qty)
                        : 0,

                plan_qty:
                    item.plan_qty != null && !isNaN(Number(item.plan_qty))
                        ? Number(item.plan_qty)
                        : 0,

                unit_cost_handled:
                    item.unit_cost_handled != null && !isNaN(Number(item.unit_cost_handled))
                        ? Number(item.unit_cost_handled)
                        : 0,

                total_cost_handled:
                    item.total_cost_handled != null && !isNaN(Number(item.total_cost_handled))
                        ? Number(item.total_cost_handled)
                        : 0,
            }));

            return response.setComplete(lang.msgFound('field.return'), cleanedData);

        } catch (error: any) {
            console.error(`Error in ${operation}:`, error);

            if (error instanceof QueryFailedError) {
                return response.setIncomplete(
                    lang.msgErrorFunction(operation, error.message)
                );
            }

            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }

    async getTransferAll(
        options?: {
            isExecution?: boolean;   // ✅ true = status Waiting / false = all status except FINISHED/COMPLETED
            store_type?: string;
            mc_code?: string;
        },
        manager?: EntityManager
        ): Promise<ApiResponse<any | null>> {
    
        const response = new ApiResponse<any | null>();
        const operation = 'AllOrdersService.getTransferAll';

        try {
            const repository = manager
                ? manager.getRepository(Orders)
                : this.ordersRepository;

            const query = repository
                .createQueryBuilder('order')
                .leftJoin('orders_transfer', 'transfer', 'transfer.order_id = order.order_id')
                .leftJoin('m_stock_items', 'stock', 'stock.item_id = order.item_id')
                .leftJoin('m_location', 'orderLoc', 'orderLoc.loc_id = order.loc_id')
                .leftJoin('m_location', 'relatedLoc', 'relatedLoc.loc_id = transfer.related_loc_id')

                .select([
                    'order.order_id AS order_id',
                    'order.mc_code AS mc_code',
                    'order.type AS type',
                    'order.execution_mode AS execution_mode', 
                    'order.transfer_scenario AS transfer_scenario',  

                    'transfer.transfer_id AS transfer_id',
                    'transfer.object_id AS object_id',
                    'transfer.unit_cost_handled AS unit_cost_handled',
                    'transfer.related_order_id AS related_order_id',  
                    
                    'stock.item_id AS item_id',
                    'stock.stock_item AS stock_item',
                    'stock.item_desc AS item_desc',

                    'order.store_type AS store_type',
                    'order.cond AS cond',
                    'order.plan_qty AS plan_qty',
                    'order.actual_qty AS actual_qty',

                    // ✅ คำนวณ total_cost_handled
                    '(IFNULL(transfer.unit_cost_handled,0) * IFNULL(order.plan_qty,0)) AS total_cost_handled',

                    'order.requested_by AS requested_by',
                    "DATE_FORMAT(order.requested_at, '%d/%m/%Y') AS requested_at",

                    `
                    CASE
                        WHEN order.transfer_scenario = 'INTERNAL_OUT'
                            THEN transfer.transfer_status
                        ELSE order.status
                    END AS status
                    `,

                    /* from_loc + from_box_loc*/
                    `
                    CASE
                        WHEN order.transfer_scenario IN ('OUTBOUND', 'INTERNAL_OUT')
                            THEN COALESCE(orderLoc.loc, '-')
                        ELSE '-'
                    END AS from_loc
                    `,
                    `
                    CASE
                        WHEN order.transfer_scenario IN ('OUTBOUND', 'INTERNAL_OUT')
                            THEN COALESCE(orderLoc.box_loc, '-')
                        ELSE '-'
                    END AS from_box_loc
                    `,



                    /* to_loc + to_box_loc*/
                    `
                    CASE
                        WHEN order.transfer_scenario = 'INBOUND'
                            THEN COALESCE(orderLoc.loc, '-')
                        WHEN order.transfer_scenario = 'INTERNAL_OUT'
                            THEN COALESCE(relatedLoc.loc, '-')
                        ELSE '-'
                    END AS to_loc
                    `,
                    `
                    CASE
                        WHEN order.transfer_scenario = 'INBOUND'
                            THEN COALESCE(orderLoc.box_loc, '-')
                        WHEN order.transfer_scenario = 'INTERNAL_OUT'
                            THEN COALESCE(relatedLoc.box_loc, '-')
                        ELSE '-'
                    END AS to_box_loc
                    `,

                ])

                // 🔒 base condition
                .where('order.type = :type', { type: 'TRANSFER' })
                .andWhere('order.transfer_scenario != :excludedScenario', {
                    excludedScenario: 'INTERNAL_IN',
                })
                .orderBy('order.requested_at', 'ASC')
                .cache(false);

            // 🔥 true = status Waiting / false = all status except FINISHED/COMPLETED / undefined = all status
            // if (options?.isExecution === true) {
            //         // เฉพาะ WAITING
            //         query.andWhere(`
            //             (
            //                 (order.transfer_scenario = 'INTERNAL_OUT'
            //                     AND transfer.transfer_status = :waitingTransfer)
            //                 OR
            //                 (order.transfer_scenario != 'INTERNAL_OUT'
            //                     AND order.status = :waitingOrder)
            //             )
            //         `, {
            //             waitingTransfer: StatusOrders.WAITING,
            //             waitingOrder: StatusOrders.WAITING,
            //         });
           if (options?.isExecution === true) {
    query.andWhere(`
        (
            CASE
                WHEN order.transfer_scenario = 'INTERNAL_OUT'
                    THEN transfer.transfer_status
                ELSE order.status
            END
        ) = :waitingStatus
    `, {
        waitingStatus: StatusOrders.WAITING,
    });
} else if (options?.isExecution === false) {
    query.andWhere(`
        (
            CASE
                WHEN order.transfer_scenario = 'INTERNAL_OUT'
                    THEN transfer.transfer_status
                ELSE order.status
            END
        ) NOT IN (:...excludedStatuses)
    `, {
        excludedStatuses: [
            StatusOrders.WAITING,
            StatusOrders.FINISHED,
            StatusOrders.COMPLETED,
        ],
    });
}

            // undefined → ไม่ใส่ where (ได้ทุกสถานะ)

            // 🔎 filter store_type
            if (options?.store_type) {
                query.andWhere('order.store_type = :store_type', {
                    store_type: options.store_type,
                });
            }

            // 🔎 filter mc_code
            if (options?.mc_code) {
                query.andWhere('order.mc_code = :mc_code', {
                    mc_code: options.mc_code,
                });
            }

            const rawData = await query.getRawMany();

            if (!rawData || rawData.length === 0) {
                return response.setIncomplete(lang.msgNotFound('field.transfer'));
            }

            // ✅ normalize ค่าเหมือนเดิม
            const cleanedData = rawData.map((item: any) => ({
                ...item,
                actual_qty:
                    item.actual_qty != null && !isNaN(Number(item.actual_qty))
                        ? Number(item.actual_qty)
                        : 0,

                plan_qty:
                    item.plan_qty != null && !isNaN(Number(item.plan_qty))
                        ? Number(item.plan_qty)
                        : 0,

                unit_cost_handled:
                    item.unit_cost_handled != null && !isNaN(Number(item.unit_cost_handled))
                        ? Number(item.unit_cost_handled)
                        : 0,

                total_cost_handled:
                    item.total_cost_handled != null && !isNaN(Number(item.total_cost_handled))
                        ? Number(item.total_cost_handled)
                        : 0,
            }));

            return response.setComplete(lang.msgFound('field.transfer'), cleanedData);

        } catch (error: any) {
            console.error(`Error in ${operation}:`, error);

            if (error instanceof QueryFailedError) {
                return response.setIncomplete(
                    lang.msgErrorFunction(operation, error.message)
                );
            }

            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }

    async getStatusAll(
        options?: {
            isExecution?: boolean;
            store_type?: string;
            mc_code?: string;
            type?: TypeInfm.RECEIPT | TypeInfm.USAGE | TypeInfm.RETURN | TypeInfm.TRANSFER;
        },
        manager?: EntityManager
    ): Promise<ApiResponse<any | null>> {

        const response = new ApiResponse<any | null>();
        const operation = 'AllOrdersService.getStatusAll';

        try {
            const repository = manager
                ? manager.getRepository(Orders)
                : this.ordersRepository;

            const query = repository
                .createQueryBuilder('order')

                // ----------------------------
                // USAGE (direct)
                // ----------------------------
                .leftJoin(
                    'orders_usage',
                    'usage_direct',
                    `usage_direct.order_id = order.order_id AND order.type = 'USAGE'`
                )

                // ----------------------------
                // RETURN → orders_return → orders_usage
                // ----------------------------
                .leftJoin(
                    'orders_return',
                    'ret',
                    `ret.order_id = order.order_id AND order.type = 'RETURN'`
                )
                .leftJoin(
                    'orders_usage',
                    'usage_from_return',
                    `usage_from_return.usage_id = ret.usage_id`
                )

                // ----------------------------
                // RECEIPT
                // ----------------------------
                .leftJoin(
                    'orders_receipt',
                    'receipt',
                    `receipt.order_id = order.order_id AND order.type = 'RECEIPT'`
                )

                // ----------------------------
                // TRANSFER
                // ----------------------------
                .leftJoin(
                    'orders_transfer',
                    'transfer',
                    `transfer.order_id = order.order_id AND order.type = 'TRANSFER'`
                )

                // from = order.loc_id
                .leftJoin('m_location', 'fromLoc', 'fromLoc.loc_id = order.loc_id')

                // to = transfer.related_loc_id
                .leftJoin(
                    'm_location',
                    'toLoc',
                    'toLoc.loc_id = transfer.related_loc_id'
                )

                // ----------------------------
                // master data
                // ----------------------------
                .leftJoin(
                    'm_stock_items',
                    'stock',
                    'stock.item_id = order.item_id'
                )

                // ----------------------------
                // SELECT
                // ----------------------------
                .select([

                    'order.order_id AS order_id',
                    'order.type AS type',
                    'order.mc_code AS mc_code',
                    'order.cond AS cond',
                    'order.status AS status',
                    'order.plan_qty AS plan_qty',
                    'order.actual_qty AS actual_qty',
                    'order.item_id AS item_id',
                    'order.loc_id AS loc_id',
                    'order.transfer_scenario AS transfer_scenario',
                    'order.execution_mode AS execution_mode',

                    `
                    CASE
                        WHEN order.type = 'TRANSFER'
                            AND order.transfer_scenario = 'INTERNAL_OUT'
                            THEN transfer.transfer_status
                        ELSE order.status
                    END AS display_status
                    `,

                    // ----------------------------
                    // usage info (USAGE / RETURN)
                    // ----------------------------
                    `
                    CASE
                        WHEN order.type = 'USAGE'
                            THEN usage_direct.work_order
                        WHEN order.type = 'RETURN'
                            THEN usage_from_return.work_order
                        ELSE NULL
                    END AS work_order
                    `,
                    `
                    CASE
                        WHEN order.type = 'USAGE'
                            THEN usage_direct.spr_no
                        WHEN order.type = 'RETURN'
                            THEN usage_from_return.spr_no
                        ELSE NULL
                    END AS spr_no
                    `,
                    `
                    CASE
                        WHEN order.type = 'USAGE'
                            THEN usage_direct.usage_num
                        WHEN order.type = 'RETURN'
                            THEN usage_from_return.usage_num
                        ELSE NULL
                    END AS usage_num
                    `,
                    `
                    CASE
                        WHEN order.type = 'USAGE'
                            THEN usage_direct.usage_line
                        WHEN order.type = 'RETURN'
                            THEN usage_from_return.usage_line
                        ELSE NULL
                    END AS usage_line
                    `,

                    // ----------------------------
                    // receipt info
                    // ----------------------------
                    'receipt.po_num AS po_num',
                    'receipt.object_id AS object_id',

                    // ----------------------------
                    // item
                    // ----------------------------
                    'stock.stock_item AS stock_item',
                    'stock.item_desc AS item_desc',

                    // ----------------------------
                    // location (NEW LOGIC)
                    // ----------------------------

                    // ---------- FROM ----------
                    `
                    CASE
                        -- USAGE → from = order.loc_id
                        WHEN order.type = 'USAGE'
                            THEN fromLoc.loc

                        -- TRANSFER OUTBOUND
                        WHEN order.type = 'TRANSFER'
                            AND order.transfer_scenario = 'OUTBOUND'
                            THEN fromLoc.loc

                        -- TRANSFER INTERNAL_OUT
                        WHEN order.type = 'TRANSFER'
                            AND order.transfer_scenario = 'INTERNAL_OUT'
                            THEN fromLoc.loc

                        ELSE NULL
                    END AS from_loc
                    `,
                    `
                    CASE
                        WHEN order.type = 'USAGE'
                            THEN fromLoc.box_loc

                        WHEN order.type = 'TRANSFER'
                            AND order.transfer_scenario = 'OUTBOUND'
                            THEN fromLoc.box_loc

                        WHEN order.type = 'TRANSFER'
                            AND order.transfer_scenario = 'INTERNAL_OUT'
                            THEN fromLoc.box_loc

                        ELSE NULL
                    END AS from_box_loc
                    `,

                    // ---------- TO ----------
                    `
                    CASE
                        -- RECEIPT
                        WHEN order.type = 'RECEIPT'
                            THEN fromLoc.loc

                        -- RETURN
                        WHEN order.type = 'RETURN'
                            THEN fromLoc.loc

                        -- TRANSFER INBOUND → ใช้ order.loc_id
                        WHEN order.type = 'TRANSFER'
                            AND order.transfer_scenario = 'INBOUND'
                            THEN fromLoc.loc

                        -- TRANSFER INTERNAL_OUT → ใช้ related_loc_id
                        WHEN order.type = 'TRANSFER'
                            AND order.transfer_scenario = 'INTERNAL_OUT'
                            THEN toLoc.loc

                        ELSE NULL
                    END AS to_loc
                    `,
                    `
                    CASE
                        WHEN order.type = 'RECEIPT'
                            THEN fromLoc.box_loc

                        WHEN order.type = 'RETURN'
                            THEN fromLoc.box_loc

                        WHEN order.type = 'TRANSFER'
                            AND order.transfer_scenario = 'INBOUND'
                            THEN fromLoc.box_loc

                        WHEN order.type = 'TRANSFER'
                            AND order.transfer_scenario = 'INTERNAL_OUT'
                            THEN toLoc.box_loc

                        ELSE NULL
                    END AS to_box_loc
                    `,


                    "DATE_FORMAT(order.requested_at, '%d/%m/%Y') AS requested_at",
                ])

                // ----------------------------
                // order by (เหมือนเดิม)
                // ----------------------------
                .orderBy(`
                    CASE
                        WHEN order.status = 'PROCESSING' THEN 1
                        WHEN order.status = 'PENDING' THEN 3
                        WHEN order.status = 'COMPLETED' THEN 4
                        WHEN order.status = 'FINISHED' THEN 5
                        ELSE 2
                    END
                `, 'ASC')
                .addOrderBy('order.requested_at', 'ASC');

            // ----------------------------
            // filters (เหมือนเดิม)
            // ----------------------------
            if (options?.isExecution === true) {
                query.andWhere(`
                    (
                        (order.type = 'TRANSFER'
                            AND order.transfer_scenario = 'INTERNAL_OUT'
                            AND transfer.transfer_status = :waitingTransfer)
                        OR
                        (
                            NOT (order.type = 'TRANSFER'
                                AND order.transfer_scenario = 'INTERNAL_OUT')
                            AND order.status = :waitingOrder
                        )
                    )
                `, {
                    waitingTransfer: StatusOrders.WAITING,
                    waitingOrder: StatusOrders.WAITING,
                });
            }
            else if (options?.isExecution === false) {
                query.andWhere(`
                    (
                        (order.type = 'TRANSFER'
                            AND order.transfer_scenario = 'INTERNAL_OUT'
                            AND transfer.transfer_status != :waitingTransfer)
                        OR
                        (
                            NOT (order.type = 'TRANSFER'
                                AND order.transfer_scenario = 'INTERNAL_OUT')
                            AND order.status != :waitingOrder
                        )
                    )
                `, {
                    waitingTransfer: StatusOrders.WAITING,
                    waitingOrder: StatusOrders.WAITING,
                });
            }

            // ----------------------------
            // exclude INTERNAL_IN (TRANSFER only)
            // ----------------------------
            query.andWhere(`
                (
                    order.type != 'TRANSFER'
                    OR order.transfer_scenario != 'INTERNAL_IN'
                )
            `);


            if (options?.store_type) {
                query.andWhere('order.store_type = :store_type', {
                    store_type: options.store_type
                });
            }

            if (options?.mc_code) {
                query.andWhere('order.mc_code = :mc_code', {
                    mc_code: options.mc_code
                });
            }

            if (options?.type) {
                query.andWhere('order.type = :type', {
                    type: options.type
                });
            }

            const rawData = await query.getRawMany();

            if (!rawData || rawData.length === 0) {
                return response.setIncomplete(lang.msgNotFound('field.order'));
            }

            // ----------------------------
            // normalize (ใส่ - ให้ฟิลด์ที่ไม่มี)
            // ----------------------------
            const cleanedData = rawData.map((item: any) => ({
                ...item,

                from_loc: item.from_loc ?? '-',
                from_box_loc: item.from_box_loc ?? '-',
                to_loc: item.to_loc ?? '-',
                to_box_loc: item.to_box_loc ?? '-',

                work_order: item.work_order ?? '-',
                spr_no: item.spr_no ?? '-',
                usage_num: item.usage_num ?? '-',
                usage_line: item.usage_line ?? '-',

                po_num: item.po_num ?? '-',
                object_id: item.object_id ?? '-',

                plan_qty: Number(item.plan_qty || 0),
                actual_qty: Number(item.actual_qty || 0),
            }));

            return response.setComplete(
                lang.msgFound('field.order'),
                cleanedData
            );

        } catch (error: any) {
            console.error(`Error in ${operation}:`, error);

            if (error instanceof QueryFailedError) {
                return response.setIncomplete(
                    lang.msgErrorFunction(operation, error.message)
                );
            }

            throw error;
        }
    }


}