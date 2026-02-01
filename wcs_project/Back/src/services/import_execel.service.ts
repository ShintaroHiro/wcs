import { EntityManager } from 'typeorm';
import { AppDataSource } from '../config/app-data-source';
import { ApiResponse } from '../models/api-response.model';
import * as lang from '../utils/LangHelper';
import * as validate from '../utils/ValidationUtils';

import { Orders } from '../entities/orders.entity';
import { OrdersUsage } from '../entities/order_usage.entity';
import { OrdersLog } from '../entities/orders_log.entity';
import { StockItems } from '../entities/m_stock_items.entity';
import { StatusOrders, TypeInfm, TaskSource, TaskSubsystem } from '../common/global.enum';

import { Locations } from '../entities/m_location.entity';
import { s_user } from '../entities/s_user.entity';
import { OrdersReceipt } from '../entities/order_receipt.entity';
import { UsageInventory } from '../entities/order_usage_inv.entity';
import { OrdersReturn } from '../entities/order_return.entity';
import { ReturnInventory } from '../entities/order_return_inv.entity';
import { Inventory } from '../entities/inventory.entity';
import { InventorySum } from '../entities/inventory_sum.entity';

function parseRequestedDate(dateStr: string): Date {
    if (!dateStr) {
        throw new Error('is required');
    }

    // DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const [dd, mm, yyyy] = dateStr.split('-').map(Number);
        const d = new Date(yyyy, mm - 1, dd);
        if (!isNaN(d.getTime())) return d;
    }

    // DD-MMM-YYYY (24-Sep-2024)
    if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(dateStr)) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d;
    }

    throw new Error(`unsupported format (${dateStr})`);
}

export function parseNumber(val: any): number {
    if (val === undefined || val === null) {
        return NaN;
    }

    const num = Number(
        String(val)
            .replace(/,/g, '')
            .trim()
    );

    return Number.isFinite(num) ? num : NaN;
}

export class ImportService {
    async createUsageJson(
        data: any[],
        reqUsername: string,
        manager?: EntityManager
    ): Promise<ApiResponse<any>> {
        const response = new ApiResponse<any>();
        const operation = 'ImportService.createUsageJson';

        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager || queryRunner?.manager;

        if (!useManager) {
        return response.setIncomplete(lang.msg('validation.no_entityManager_or_queryRunner_available'));
        }

        if (!manager && queryRunner) {
        await queryRunner.connect();
        await queryRunner.startTransaction();
        }

        try {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Excel data is empty');
        }

        const ordersRepo = useManager.getRepository(Orders);
        const usageRepo = useManager.getRepository(OrdersUsage);
        const logRepo = useManager.getRepository(OrdersLog);
        const stockRepo = useManager.getRepository(StockItems);
        const locationRepo = useManager.getRepository(Locations);
        const inventoryRepo = useManager.getRepository(Inventory);
        const userRepo = useManager.getRepository(s_user);

        /** เตรียม buffer */
        const buffer: {
            order: Partial<Orders>;
            usage: Partial<OrdersUsage>;
            log: Partial<OrdersLog>;
            item_id: number;
            loc_id: number;
            plan_qty: number;
        }[] = [];

        //default
        const DEFAULT_ITEM_ID = 1;
        const DEFAULT_LOC_ID = 4;
        const DEFAULT_STORE_TYPE = 'T1';

        // =========================
        // Phase 1: Validate + Lookup
        // =========================
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNo = row.excel_row_no ?? i + 1;

        /** ---------- Required ---------- */
        const requiredFields = [
            'loc',
            'box_loc',
            'stock_item',
            'item_desc',
            'plan_qty',
            'cond',
            'mc_code',
            //'requested_at',
            // 'requested_by',
            // 'usage_type',
            'work_order',
            'spr_no',
            'usage_num',
            'usage_line',
            'split',
            'invuse_status',
        ];

        const FIELD_LABEL_MAP: Record<string, string> = {
            loc: 'FROM LOCATION',
            box_loc: 'FROM BIN',
            stock_item: 'STOCK ITEM',
            item_desc: 'ITEM DESCRIPTION',
            cond: 'CONDITION',
            mc_code: 'MAINTENANCE CONTRACT',
            //requested_at: 'REQUIREDDATE',
            // requested_by: 'REQUESTEDBY',
            // usage_type: 'USETYPE',
            work_order: 'WORK ORDER',
            spr_no: 'SPR NO.',
            usage_num: 'INVUSENUM',
            usage_line: 'USAGE LINE',
            split: 'SPLIT',
            invuse_status: 'INVUSE STATUS',
        };

        for (const f of requiredFields) {
            if (validate.isNullOrEmpty(row[f])) {
                const label = FIELD_LABEL_MAP[f] ?? f;
                throw new Error(`Row ${rowNo}: column ${label} is required`);
            }
        }

         /** ---------- Location ---------- */
        // const location = await locationRepo.findOne({
        //     where: {
        //         loc: row.loc,
        //         box_loc: row.box_loc,
        //     },
        // });
            
        // if (!location) {
        //     throw new Error(
        //     `Row ${rowNo}: Location not found (${row.loc} / ${row.box_loc})`
        //     );
        // }

        //mock up
        let location = await locationRepo.findOne({
            where: { loc: row.loc, box_loc: row.box_loc },
        });

        if (!location) {
            location = {
                loc_id: DEFAULT_LOC_ID,
                loc: row.loc,
                box_loc: row.box_loc,
                store_type: DEFAULT_STORE_TYPE,
            } as Locations;
        }

        /** ---------- Stock Item ---------- */
        // const stockItem = await stockRepo.findOne({
        //     where: { stock_item: row.stock_item },
        // });

        // if (!stockItem) {
        //     throw new Error(
        //     `Row ${rowNo}: Stock item not found (${row.stock_item})`
        //     );
        // }
        
        //mock up
        let stockItem = await stockRepo.findOne({
            where: { stock_item: row.stock_item },
        });

        if (!stockItem) {
            stockItem = {
                item_id: DEFAULT_ITEM_ID,       // เช่น 1 หรือ item TEST
                stock_item: row.stock_item,
                item_desc: '[AUTO IMPORT]',
            } as StockItems;
        }
        // replace item_desc
        row.item_desc = stockItem.item_desc;
        row.item_id = stockItem.item_id;

         /** ---------- Requested Date ---------- */
        // if (!row.requested_at) {
        //     throw new Error(`Row ${rowNo}: REQUIREDDATE is required`);
        // }

        // let requestedAt: Date;

        // try {
        //     requestedAt = parseRequestedDate(row.requested_at);
        // } catch (err: any) {
        //     throw new Error(`Row ${rowNo}: REQUIREDDATE ${err.message}`);
        // }

        //mock up
        const requestedAt = row.requested_at
            ? parseRequestedDate(row.requested_at)
            : new Date();

        // /** ---------- Requested User ---------- */
        // const requestedUser = await userRepo.findOne({
        // where: { username: row.requested_by },
        // });

        // if (!requestedUser) {
        // throw new Error(
        //     `Row ${rowNo}: Requested user not found (${row.requested_by})`
        // );
        // }

        /** ---------- Requested User ---------- */
        const requestedUser = await userRepo.findOne({
        where: { username: reqUsername },
        });

        if (!requestedUser) {
            throw new Error('Requested user not found');
        }

        /** ---------- USAGE TYPE ---------- */
        if (row.usage_type !== 'ISSUE') {
            throw new Error(
                `Row ${rowNo}: USETYPE must be ISSUE`
            );
        }

        /** ---------- PLAN_QTY ---------- */
        const planQty = parseNumber(row.plan_qty);

        if (!Number.isFinite(planQty) || planQty <= 0) {
            throw new Error(
                `Row ${rowNo}: QUANTITY must be greater than 0`
            );
        }

        /** ---------- USAGE_TYPE ---------- */
        const usageType = row.usage_type ?? 'ISSUE';

        buffer.push({
            order: {
                mc_code: row.mc_code,
                cond: row.cond,
                plan_qty: planQty,

                requested_at: requestedAt,
                requested_by: row.requested_by, 
                created_by_user_id: requestedUser.user_id, //ใช้ user_id จาก token

                loc_id: location.loc_id,
                store_type: location.store_type,
                item_id: stockItem.item_id,

                status: StatusOrders.WAITING,
                type: TypeInfm.USAGE,
                
                import_by: reqUsername,
            },
            usage: {
                usage_type: usageType,
                work_order: row.work_order,
                spr_no: row.spr_no,
                usage_num: row.usage_num,
                usage_line: row.usage_line,
                split: row.split,
                invuse_status: row.invuse_status,
            },
            log: {
                type: TypeInfm.USAGE,
                item_id: stockItem.item_id,
                stock_item: stockItem.stock_item,
                item_desc: stockItem.item_desc,
                loc_id: location.loc_id,
                loc: location.loc,
                box_loc: location.box_loc,
                cond: row.cond,
                plan_qty: planQty,
                status: StatusOrders.WAITING,
                actor: reqUsername,
                source: TaskSource.SYSTEM,
                subsystem: TaskSubsystem.CORE,
            },
                item_id: stockItem.item_id,
                loc_id: location.loc_id,
                plan_qty: planQty,
        });
        }

        // =========================
        // Phase 2: เช็ค stock แบบ SUM
        // =========================
        // const usageMap = new Map<
        //     string,
        //     {
        //         item_id: number;
        //         stock_item: string;
        //         loc_id: number;
        //         loc: string;
        //         box_loc: string;
        //         totalPlanQty: number;
        //     }
        //     >();

        //     for (const row of buffer) {
        //         const key = `${row.item_id}_${row.loc_id}`;

        //         if (!usageMap.has(key)) {
        //             usageMap.set(key, {
        //             item_id: row.item_id,
        //             stock_item: row.log.stock_item ?? '',
        //             loc_id: row.loc_id,
        //             loc: row.log.loc ?? '',
        //             box_loc: row.log.box_loc ?? '',
        //             totalPlanQty: 0,
        //             });
        //         }
        //         usageMap.get(key)!.totalPlanQty += row.plan_qty;
        //     }

        //     const invSumRepo = useManager.getRepository(InventorySum);

        //     for (const [, data] of usageMap) {
        //         const {
        //             item_id,
        //             stock_item,
        //             loc_id,
        //             loc,
        //             box_loc,
        //             totalPlanQty,
        //         } = data;

        //         const sumInv = await invSumRepo.findOne({
        //             where: {
        //                 item_id,
        //                 loc_id,
        //                 is_active: true,
        //             },
        //         });

        //         if (!sumInv) {
        //             throw new Error(
        //                 `Item has never been received into inventory (stock_item=${stock_item}, loc=${loc}, box_loc=${box_loc})`
        //             );
        //         }

        //         if (sumInv.sum_inv_qty < totalPlanQty) {
        //             throw new Error(
        //                 `Inventory not enough (stock_item=${stock_item}, required=${totalPlanQty}, available=${sumInv.sum_inv_qty})`
        //             );
        //         }

        //     }


        // =========================
        // Phase 3: Save
        // =========================
        const savedOrders: Orders[] = [];

        for (const row of buffer) {
            const savedOrder = await ordersRepo.save(row.order);

            await usageRepo.save({
                ...row.usage,
                order_id: savedOrder.order_id,
            });


            // // ✅ save usage_inventory
            // await usageInvRepo.save({
            //     usage_id: savedUsage.usage_id,
            //     inv_id: row.inv_id,
            //     usage_qty: row.plan_qty,
            // });

            // ✅ log
            await logRepo.save({
                ...row.log,
                order_id: savedOrder.order_id,
            });

            savedOrders.push(savedOrder);
        }

        if (!manager && queryRunner) {
            await queryRunner.commitTransaction();
        }

        return response.setComplete(
            lang.msgSuccessAction('created', 'orders'),
            savedOrders
        );

        } catch (error: any) {
            if (!manager && queryRunner) {
                await queryRunner.rollbackTransaction();
            }
            console.error(`❌ ${operation}`, error);
            return response.setIncomplete(error.message);
        } finally {
            if (!manager && queryRunner) {
                await queryRunner.release();
            }
        }
    }

    async createReceiptJson(
        data: any[],
        reqUsername: string,
        manager?: EntityManager
    ): Promise<ApiResponse<any>> {
        const response = new ApiResponse<any>();
        const operation = 'ImportService.createReceiptJson';

        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager || queryRunner?.manager;

        if (!useManager) {
        return response.setIncomplete(lang.msg('validation.no_entityManager_or_queryRunner_available'));
        }

        if (!manager && queryRunner) {
        await queryRunner.connect();
        await queryRunner.startTransaction();
        }

        try {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Excel data is empty');
        }

        const ordersRepo = useManager.getRepository(Orders);
        const receiptRepo = useManager.getRepository(OrdersReceipt);
        const logRepo = useManager.getRepository(OrdersLog);
        const stockRepo = useManager.getRepository(StockItems);
        const locationRepo = useManager.getRepository(Locations);
        const userRepo = useManager.getRepository(s_user);

        /** เตรียม buffer */
        const buffer: {
            order: Partial<Orders>;
            receipt: Partial<OrdersReceipt>;
            log: Partial<OrdersLog>;
            item_id: number;
            loc_id: number;
            plan_qty: number;
        }[] = [];

        const DEFAULT_ITEM_ID = 1;
        const DEFAULT_LOC_ID = 4;
        const DEFAULT_STORE_TYPE = 'T1';

        // =========================
        // Phase 1: Validate + Lookup
        // =========================
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNo = row.excel_row_no ?? i + 1;

        /** ---------- Required ---------- */
        const requiredFields = [
            'transtype',
            'loc',
            'box_loc',
            'stock_item',
            'item_desc',
            'cond',
            'mc_code',
            //'requested_at',
            'unit_cost_handled',
            //'po_num',
            'object_id',
        ];

        const FIELD_LABEL_MAP: Record<string, string> = {
            transtype: 'TRANSTYPE',
            loc: 'TO_STORE',
            box_loc: 'TO_BINNUM',
            stock_item: 'ITEMNUM',
            item_desc: 'DESCRIPTION',
            cond: 'CONDITIONCODE',
            mc_code: 'AACONTRACT',
            //requested_at: 'TRANSDATE',
            unit_cost_handled: 'NEWCOST',
            //po_num: 'PONUM',
            object_id: 'OBJECT_ID',
        };

        for (const f of requiredFields) {
            if (validate.isNullOrEmpty(row[f])) {
                const label = FIELD_LABEL_MAP[f] ?? f;
                throw new Error(`Row ${rowNo}: column ${label} is required`);
            }
        }

         /** ---------- Location ---------- */
        // const location = await locationRepo.findOne({
        //     where: {
        //     loc: row.loc,
        //     box_loc: row.box_loc,
        //     },
        // });

            
        // if (!location) {
        //     throw new Error(
        //     `Row ${rowNo}: Location not found (${row.loc} / ${row.box_loc})`
        //     );
        // }

         //mock up
        let location = await locationRepo.findOne({
            where: { loc: row.loc, box_loc: row.box_loc },
        });

        if (!location) {
            location = {
                loc_id: DEFAULT_LOC_ID,
                loc: row.loc,
                box_loc: row.box_loc,
                store_type: DEFAULT_STORE_TYPE,
            } as Locations;
        }
        
        /** ---------- Stock Item(ITEMNUM) ---------- */
        // const stockItem = await stockRepo.findOne({
        //     where: { stock_item: row.stock_item },
        // });

        // if (!stockItem) {
        //     throw new Error(
        //     `Row ${rowNo}: ITEMNUM not found (${row.stock_item})`
        //     );
        // }

        //mock up
        let stockItem = await stockRepo.findOne({
            where: { stock_item: row.stock_item },
        });

        if (!stockItem) {
            stockItem = {
                item_id: DEFAULT_ITEM_ID,       // เช่น 1 หรือ item TEST
                stock_item: row.stock_item,
                item_desc: '[AUTO IMPORT]',
            } as StockItems;
        }

        // replace item_desc
        row.item_desc = stockItem.item_desc;
        row.item_id = stockItem.item_id;

        /** ---------- Requested Date ---------- */
        // if (!row.requested_at) {
        //     throw new Error(`Row ${rowNo}: TRANSDATE is required`);
        // }

        // let requestedAt: Date;

        // try {
        //     requestedAt = parseRequestedDate(row.requested_at);
        // } catch (err: any) {
        //     throw new Error(`Row ${rowNo}: TRANSDATE ${err.message}`);
        // }

        //mock up
        const requestedAt = row.requested_at
            ? parseRequestedDate(row.requested_at)
            : new Date();

        /** ---------- Requested User ---------- */
        const requestedUser = await userRepo.findOne({
        where: { username: reqUsername },
        });

        if (!requestedUser) {
            throw new Error('Requested user not found');
        }

        /** ---------- TRANSTYPE ---------- */
        let transtype = row.transtype;

        if (!['RECEIPT', 'CURBALADJ'].includes(transtype)) {
            throw new Error(`Row ${rowNo}: Invalid TRANSTYPE (${transtype})`);
        }

        // map CURBALADJ → RECEIPT (business meaning)
        const normalizedTranstype =
            transtype === 'CURBALADJ' ? 'RECEIPT' : transtype;

        /** ---------- CONDITION + PLAN_QTY ---------- */
        let planQty = 0;
        let qtyField = ''; // 👉 เก็บชื่อ column

        if (transtype === 'RECEIPT') {
            if (row.cond !== 'NEW') {
                throw new Error(`Row ${rowNo}: RECEIPT allows only NEW condition`);
            }
            planQty = parseNumber(row.new_qty);
            qtyField = 'NEW_QTY';
        }

        if (transtype === 'CURBALADJ') {
            if (!['CAPITAL', 'RECOND', 'RECONDITION'].includes(row.cond)) {
                throw new Error(
                    `Row ${rowNo}: CURBALADJ allows only CAPITAL or RECONDITION`
                );
            }

            if (row.cond === 'CAPITAL') {
                planQty = parseNumber(row.cap_qty);
                qtyField = 'CAP_QTY';
            } else {
                planQty = parseNumber(row.recond_qty);
                qtyField = 'RECOND_QTY';
            }
        }

        if (!Number.isFinite(planQty) || planQty <= 0) {
            throw new Error(
                `Row ${rowNo}: ${qtyField} must be greater than 0`
            );
        }

        /*normalize unit_cost_handled */
        // const rawCost = row.unit_cost_handled;

        // const unitCostHandled = rawCost
        //     ? Number(String(rawCost).replace(/,/g, ''))
        //     : 0;

        // if (!Number.isFinite(unitCostHandled)) {
        //     throw new Error(
        //         `Row ${rowNo}: invalid unit_cost_handled (${rawCost})`
        //     );
        // }

        buffer.push({
            order: {
                mc_code: row.mc_code,
                cond: row.cond,
                plan_qty: planQty,

                requested_at: requestedAt,
                requested_by: reqUsername,
                created_by_user_id: requestedUser.user_id,

                loc_id: location.loc_id,
                store_type: location.store_type,
                item_id: stockItem.item_id,

                status: StatusOrders.WAITING,
                type: normalizedTranstype,
                
                import_by: reqUsername,
            },
            receipt: {
                po_num: row.po_num,
                object_id: row.object_id,
                unit_cost_handled: row.unit_cost_handled,
            },
            log: {
                type: normalizedTranstype,
                item_id: stockItem.item_id,
                stock_item: stockItem.stock_item,
                item_desc: stockItem.item_desc,
                loc_id: location.loc_id,
                loc: location.loc,
                box_loc: location.box_loc,
                cond: row.cond,
                plan_qty: planQty,
                status: StatusOrders.WAITING,
                actor: reqUsername,
                source: TaskSource.SYSTEM,
                subsystem: TaskSubsystem.CORE,
            },
                item_id: stockItem.item_id,
                loc_id: location.loc_id,
                plan_qty: planQty,
        });
        }

        // =========================
        // Phase 3: Save
        // =========================
        const savedOrders: Orders[] = [];

        for (const row of buffer) {
            const savedOrder = await ordersRepo.save(row.order);

            await receiptRepo.save({
                ...row.receipt,
                order_id: savedOrder.order_id,
            });

            await logRepo.save({
                ...row.log,
                order_id: savedOrder.order_id,
            });

            savedOrders.push(savedOrder);
        }

        if (!manager && queryRunner) {
            await queryRunner.commitTransaction();
        }

        return response.setComplete(
            lang.msgSuccessAction('created', 'orders'),
            savedOrders
        );

        } catch (error: any) {
            if (!manager && queryRunner) {
                await queryRunner.rollbackTransaction();
            }
            console.error(`❌ ${operation}`, error);
            return response.setIncomplete(error.message);
        } finally {
            if (!manager && queryRunner) {
                await queryRunner.release();
            }
        }
    }

    async createReturnJson(
        data: any[],
        reqUsername: string,
        manager?: EntityManager
    ): Promise<ApiResponse<any>> {
        const response = new ApiResponse<any>();
        const operation = 'ImportService.createReturnJson';

        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager || queryRunner?.manager;

        if (!useManager) {
        return response.setIncomplete(lang.msg('validation.no_entityManager_or_queryRunner_available'));
        }

        if (!manager && queryRunner) {
        await queryRunner.connect();
        await queryRunner.startTransaction();
        }

        try {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Excel data is empty');
        }

        const ordersRepo = useManager.getRepository(Orders);
        const returnRepo = useManager.getRepository(OrdersReturn);
        const usageRepo = useManager.getRepository(OrdersUsage);
        const logRepo = useManager.getRepository(OrdersLog);
        const stockRepo = useManager.getRepository(StockItems);
        const locationRepo = useManager.getRepository(Locations);
        const userRepo = useManager.getRepository(s_user);

        /** เตรียม buffer */
        const buffer: {
            order: Partial<Orders>;
            return: Partial<OrdersReturn>;
            log: Partial<OrdersLog>;
            item_id: number;
            loc_id: number;
            plan_qty: number;
        }[] = [];

        const DEFAULT_ITEM_ID = 1;
        const DEFAULT_LOC_ID = 4;
        const DEFAULT_STORE_TYPE = 'T1';
        const DEFAULT_USAGE_ID = 1;

        // =========================
        // Phase 1: Validate + Lookup
        // =========================
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNo = row.excel_row_no ?? i + 1;

        /** ---------- Required ---------- */
        const requiredFields = [
            'transtype',
            'loc',
            'box_loc',
            'stock_item',
            'item_desc',
            'plan_qty',
            'cond',
            'mc_code',
            'requested_at',
            'work_order',
            'spr_no',
            'usage_num',
            'usage_line',
        ];

        const FIELD_LABEL_MAP: Record<string, string> = {
            transtype: 'TRANSACTION TYPE',
            loc: 'TO LOCATION',
            box_loc: 'TO BIN',
            stock_item: 'STOCK ITEM',
            item_desc: 'ITEM DESCRIPTION',
            cond: 'CONDITION',
            mc_code: 'MAINTENANCE CONTRACT',
            requested_at: 'TRANSDATE',
            work_order: 'WORK ORDER',
            spr_no: 'SPR NO.',
            usage_num: 'USAGE',
            usage_line: 'USAGE LINE',
        };

        for (const f of requiredFields) {
            if (validate.isNullOrEmpty(row[f])) {
                const label = FIELD_LABEL_MAP[f] ?? f;
                throw new Error(`Row ${rowNo}: column ${label} is required`);
            }
        }

         /** ---------- Location ---------- */
        // const location = await locationRepo.findOne({
        //     where: {
        //     loc: row.loc,
        //     box_loc: row.box_loc,
        //     },
        // });
            
        // if (!location) {
        //     throw new Error(
        //     `Row ${rowNo}: Location not found (${row.loc} / ${row.box_loc})`
        //     );
        // }

         //mock up
        let location = await locationRepo.findOne({
            where: { loc: row.loc, box_loc: row.box_loc },
        });

        if (!location) {
            location = {
                loc_id: DEFAULT_LOC_ID,
                loc: row.loc,
                box_loc: row.box_loc,
                store_type: DEFAULT_STORE_TYPE,
            } as Locations;
        }

        /** ---------- Stock Item ---------- */
        // const stockItem = await stockRepo.findOne({
        //     where: { stock_item: row.stock_item },
        // });

        // if (!stockItem) {
        //     throw new Error(
        //     `Row ${rowNo}: Stock item not found (${row.stock_item})`
        //     );
        // }

        //mock up
        let stockItem = await stockRepo.findOne({
            where: { stock_item: row.stock_item },
        });

        if (!stockItem) {
            stockItem = {
                item_id: DEFAULT_ITEM_ID,       // เช่น 1 หรือ item TEST
                stock_item: row.stock_item,
                item_desc: '[AUTO IMPORT]',
            } as StockItems;
        }

        // replace item_desc
        row.item_desc = stockItem.item_desc;
        row.item_id = stockItem.item_id;

         /** ---------- Requested Date ---------- */
        // if (!row.requested_at) {
        //     throw new Error(`Row ${rowNo}: TRANSDATE is required`);
        // }

        // let requestedAt: Date;

        // try {
        //     requestedAt = parseRequestedDate(row.requested_at);
        // } catch (err: any) {
        //     throw new Error(`Row ${rowNo}: TRANSDATE ${err.message}`);
        // }

        //mock up
        const requestedAt = row.requested_at
            ? parseRequestedDate(row.requested_at)
            : new Date();

        /** ---------- Requested User ---------- */
        const requestedUser = await userRepo.findOne({
        where: { username: reqUsername },
        });

        if (!requestedUser) {
            throw new Error('Requested user not found');
        }

        /** ---------- PLAN_QTY ---------- */
        const planQty = parseNumber(row.plan_qty);

        if (!Number.isFinite(planQty) || planQty <= 0) {
            throw new Error(
                `Row ${rowNo}: QUANTITY must be greater than 0`
            );
        }

        /** ------- หา usage_id จาก orders_usage + orders ------- */
        const usageRow = await usageRepo
        .createQueryBuilder('u')
        .innerJoin(Orders, 'o', 'o.order_id = u.order_id')
        .select([
            'u.usage_id AS usage_id',
            'o.actual_qty AS actual_qty',
        ])
        .where('u.work_order = :work_order', { work_order: row.work_order })
        .andWhere('u.spr_no = :spr_no', { spr_no: row.spr_no })
        .andWhere('u.usage_num = :usage_num', { usage_num: row.usage_num })
        .andWhere('u.usage_line = :usage_line', { usage_line: row.usage_line })
        .andWhere('o.item_id = :item_id', { item_id: stockItem.item_id })
        .andWhere('o.loc_id = :loc_id', { loc_id: location.loc_id })
        .andWhere('o.mc_code = :mc_code', { mc_code: row.mc_code })
        .andWhere('o.cond = :cond', { cond: row.cond })
        .getRawMany();

        // if (usageRow.length === 0) {
        // throw new Error(
        //     `Row ${rowNo}: Usage not found (WORK ORDER=${row.work_order}, USAGE=${row.usage_num}, SPR NO.=${row.spr_no}, USAGE LINE=${row.usage_line})`
        // );
        // }

        // if (usageRow.length > 1) {
        //     throw new Error(
        //         `Row ${rowNo}: Duplicate usage found (usage key is not unique)`
        //     );
        // }

        // const { usage_id, actual_qty } = usageRow[0];

        // /** --------- เช็ค QUANTITY ห้ามเกิน plan_qty (usage) ตอนนี้ไม่ได้เช็คจริงจัง แค่เช็คตาม actual_qty รวม-------- */
        // if (planQty > Number(actual_qty)) {
        //     throw new Error(
        //         `Row ${rowNo}: QUANTITY (${planQty}) exceeds Scanned Quantity (${actual_qty})`
        //     );
        // }

        let usage_id: number;
let actual_qty: number | null = null;

if (usageRow.length === 1) {
    // ✅ เจอ usage เดียว ใช้ของจริง
    usage_id = Number(usageRow[0].usage_id);
    actual_qty = Number(usageRow[0].actual_qty);
} else {
    // ❌ ไม่เจอ OR เจอหลายแถว → ใช้ DEFAULT
    usage_id = DEFAULT_USAGE_ID;

    console.warn(
        `⚠️ Row ${rowNo}: Usage not unique or not found (found=${usageRow.length}), fallback to DEFAULT_USAGE_ID=${DEFAULT_USAGE_ID}`
    );
}

if (actual_qty !== null && planQty > actual_qty) {
    throw new Error(
        `Row ${rowNo}: QUANTITY (${planQty}) exceeds Scanned Quantity (${actual_qty})`
    );
}



        buffer.push({
            order: {
                mc_code: row.mc_code,
                cond: row.cond,
                plan_qty: planQty,

                requested_at: requestedAt,
                requested_by: reqUsername,
                created_by_user_id: requestedUser.user_id, //ใช้ user_id จาก token

                loc_id: location.loc_id,
                store_type: location.store_type,
                item_id: stockItem.item_id,

                status: StatusOrders.WAITING,
                type: TypeInfm.RETURN,
                
                import_by: reqUsername,
            },
            return: {
                usage_id,
            },
            log: {
                type: TypeInfm.USAGE,
                item_id: stockItem.item_id,
                stock_item: stockItem.stock_item,
                item_desc: stockItem.item_desc,
                loc_id: location.loc_id,
                loc: location.loc,
                box_loc: location.box_loc,
                cond: row.cond,
                plan_qty: planQty,
                status: StatusOrders.WAITING,
                actor: reqUsername,
                source: TaskSource.SYSTEM,
                subsystem: TaskSubsystem.CORE,
            },
                item_id: stockItem.item_id,
                loc_id: location.loc_id,
                plan_qty: planQty,
        });
        }

        // =========================
        // Phase 2: Save
        // =========================
        const savedOrders: Orders[] = [];

        for (const row of buffer) {
            const savedOrder = await ordersRepo.save(row.order);

            // ✅ save return ครั้งเดียว
            await returnRepo.save({
                ...row.return,
                order_id: savedOrder.order_id,
            });

            // ✅ log
            await logRepo.save({
                ...row.log,
                order_id: savedOrder.order_id,
            });

            savedOrders.push(savedOrder);
        }

        if (!manager && queryRunner) {
            await queryRunner.commitTransaction();
        }

        return response.setComplete(
            lang.msgSuccessAction('created', 'orders'),
            savedOrders
        );

        } catch (error: any) {
            if (!manager && queryRunner) {
                await queryRunner.rollbackTransaction();
            }
            console.error(`❌ ${operation}`, error);
            return response.setIncomplete(error.message);
        } finally {
            if (!manager && queryRunner) {
                await queryRunner.release();
            }
        }
    }

    async createItemJson(
        data: any[],
        reqUsername: string,
        manager?: EntityManager
    ): Promise<ApiResponse<any>> {
        const response = new ApiResponse<any>();
        const operation = 'ImportService.createItemJson';

        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager || queryRunner?.manager;

        if (!useManager) {
        return response.setIncomplete(lang.msg('validation.no_entityManager_or_queryRunner_available'));
        }

        if (!manager && queryRunner) {
        await queryRunner.connect();
        await queryRunner.startTransaction();
        }

        try {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Excel data is empty');
        }

        const stockRepo = useManager.getRepository(StockItems);
        const userRepo = useManager.getRepository(s_user);

        /** เตรียม buffer */
        const buffer: Partial<StockItems>[] = [];

        // =========================
        // Phase 1: Validate + Lookup
        // =========================
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNo = row.excel_row_no ?? i + 1;

        /** ---------- Required ---------- */
        const requiredFields = [
            //'mc_code',
            'stock_item',
            //'item_desc',
            //'order_unit',
            //'com_group',
            //'cond_en',
            //'item_status',
            //'catg_code',
            //'system',
        ];

        const FIELD_LABEL_MAP: Record<string, string> = {
            //mc_code: 'Maintain Contract',
            stock_item: 'Item',
            //item_desc: 'Description',
            //order_unit: 'Order Unit',
            //com_group: 'Commodity Group',
            //cond_en: 'Condition Enabled',
            //item_status: 'Status',
            //catg_code: 'Category Code',
            //system: 'System',
        };

        for (const f of requiredFields) {
            if (validate.isNullOrEmpty(row[f])) {
                const label = FIELD_LABEL_MAP[f] ?? f;
                throw new Error(`Row ${rowNo}: column ${label} is required`);
            }
        }

        /** ---------- Requested User ---------- */
        const requestedUser = await userRepo.findOne({
        where: { username: reqUsername },
        });

        if (!requestedUser) {
            throw new Error('Requested user not found');
        }

        /** ---------- หา stock item เดิม ---------- */
        const existItem = await stockRepo.findOne({
            where: { stock_item: row.stock_item },
        });

        buffer.push({
            // ⭐ ถ้ามี item_id → UPDATE ทั้ง row
            item_id: existItem?.item_id,

            mc_code: row.mc_code,
            stock_item: row.stock_item,
            item_desc: row.item_desc,
            order_unit: row.order_unit,
            com_group: row.com_group,
            cond_en: row.cond_en,
            item_status: row.item_status,
            catg_code: row.catg_code,
            system: row.system,

            requested_by: reqUsername,
            update_by: reqUsername,
            updated_at: new Date(), // ✅ เวลาปัจจุบัน,
        });
        }

        // =========================
        // Phase 3: Save
        // =========================
        const savedItems: StockItems[] = [];

        for (const item of buffer) {
            const saved = await stockRepo.save(item);
            savedItems.push(saved);
        }

        if (!manager && queryRunner) {
            await queryRunner.commitTransaction();
        }

        return response.setComplete(
            lang.msgSuccessAction('created', 'orders'),
            savedItems
        );

        } catch (error: any) {
            if (!manager && queryRunner) {
                await queryRunner.rollbackTransaction();
            }
            console.error(`❌ ${operation}`, error);
            return response.setIncomplete(error.message);
        } finally {
            if (!manager && queryRunner) {
                await queryRunner.release();
            }
        }
    }
}

