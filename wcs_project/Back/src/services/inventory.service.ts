import { EntityManager ,IsNull,QueryFailedError, Repository} from "typeorm";
import { OrdersReceipt } from "../entities/order_receipt.entity";
import { OrdersTransfer } from "../entities/order_transfer.entity";
import { ApiResponse } from "../models/api-response.model";
import * as lang from '../utils/LangHelper';
import { AppDataSource } from "../config/app-data-source";
import { DeepPartial } from "typeorm";

import { Orders } from "../entities/orders.entity";
import { Inventory } from "../entities/inventory.entity";
import { StockItems } from "../entities/m_stock_items.entity";
import { InventoryTrx } from "../entities/inventory_transaction.entity";
import { TypeInfm } from "../common/global.enum";
import { Locations } from "../entities/m_location.entity";
import { OrdersUsage } from "../entities/order_usage.entity";
import { OrdersReturn } from "../entities/order_return.entity";
import { UsageInventory } from "../entities/order_usage_inv.entity";
import { ReturnInventory } from "../entities/order_return_inv.entity";
import { InventorySum } from "../entities/inventory_sum.entity";

async function getInventoryFIFO(
    manager: EntityManager,
    sumInv: InventorySum
    ): Promise<Inventory[]> {
    return manager.getRepository(Inventory).find({
        where: {
        item_id: sumInv.item_id,
        loc_id: sumInv.loc_id,
        is_active: true,
        },
        order: {
        created_at: 'ASC', // FIFO
        inv_id: 'ASC',
        },
        lock: { mode: 'pessimistic_write' },
    });
}

export class InventoryService {
    private inventoryRepo: Repository<Inventory>;
    private locationRepo: Repository<Locations>;

    constructor(){
        this.inventoryRepo = AppDataSource.getRepository(Inventory);
        this.locationRepo = AppDataSource.getRepository(Locations);
    }

//---------------------------------------
// 1) RECEIPT → เพิ่ม stock พร้อมราคาใหม่
//---------------------------------------    
async receipt(manager: EntityManager, order: Orders) {
    const invRepo = manager.getRepository(Inventory);
    const invSumRepo = manager.getRepository(InventorySum);
    const receiptRepo = manager.getRepository(OrdersReceipt);
    const trxRepo = manager.getRepository(InventoryTrx);
    const itemRepo = manager.getRepository(StockItems);
    const locRepo = manager.getRepository(Locations);

    // --------------------------------------------------
    // 1) load receipt
    // --------------------------------------------------
    const r = await receiptRepo.findOne({
        where: { order_id: order.order_id },
    });

    if (!r) {
        throw new Error(`OrdersReceipt not found for order ${order.order_id}`);
    }

    if (!order.actual_qty || order.actual_qty <= 0) {
        throw new Error(`Invalid actual_qty for order ${order.order_id}`);
    }

    const unitCost = Number(Number(r.unit_cost_handled).toFixed(2));

    // --------------------------------------------------
    // 2) load master data (for trx log only)
    // --------------------------------------------------
    const item = await itemRepo.findOne({
        where: { item_id: order.item_id },
        select: ['stock_item'],
    });

    const loc = await locRepo.findOne({
        where: { loc_id: order.loc_id },
        select: ['loc', 'box_loc'],
    });

    // --------------------------------------------------
    // 3) find / lock InventorySum
    // --------------------------------------------------
    let invSum = await invSumRepo.findOne({
        where: {
            item_id: order.item_id,
            loc_id: order.loc_id,
            mc_code: order.mc_code ?? IsNull(),
            cond: order.cond ?? IsNull(),
            is_active: true,
        },
        lock: { mode: 'pessimistic_write' },
    });

    // --------------------------------------------------
    // 4) create InventorySum if not exists
    // --------------------------------------------------
    if (!invSum) {
        invSum = invSumRepo.create({
            item_id: order.item_id,
            loc_id: order.loc_id,
            mc_code: order.mc_code ?? null,
            cond: order.cond ?? null,
            sum_inv_qty: 0,
            unit_cost_sum_inv: 0,
            total_cost_sum_inv: 0,
            is_active: true,
            updated_at: new Date(),
        });
    }

    // --------------------------------------------------
    // 5) recalc InventorySum
    // --------------------------------------------------
    const newQty =
        invSum.sum_inv_qty + order.actual_qty;

    const newTotalCost =
        invSum.total_cost_sum_inv +
        unitCost * order.actual_qty;

    const newUnitCost =
        newQty > 0
            ? Number((newTotalCost / newQty).toFixed(2))
            : 0;

    invSum.sum_inv_qty = newQty;
    invSum.total_cost_sum_inv =
        Number(newTotalCost.toFixed(2));
    invSum.unit_cost_sum_inv = newUnitCost;
    invSum.updated_at = new Date();

    if (invSum.sum_inv_qty < 0) {
        throw new Error('InventorySum qty < 0 (receipt)');
    }
    const savedSum = await invSumRepo.save(invSum);

    // --------------------------------------------------
    // 6) CREATE Inventory (by record / FIFO)
    // --------------------------------------------------
    const newInv = invRepo.create({
        item_id: order.item_id,
        loc_id: order.loc_id,
        receipt_id: r.receipt_id,

        unit_cost_inv: unitCost,
        inv_qty: order.actual_qty,
        total_cost_inv: Number(
            (unitCost * order.actual_qty).toFixed(2)
        ),

        sum_inv_id: savedSum.sum_inv_id,

        is_active: true,
        updated_at: new Date(),
    });

    const savedInv = await invRepo.save(newInv);

    // --------------------------------------------------
    // 7) INSERT Inventory Transaction (RECEIPT)
    // --------------------------------------------------
    const trx = Object.assign(new InventoryTrx(), {
        inv_id: savedInv.inv_id,
        order_id: order.order_id,
        order_type: TypeInfm.RECEIPT,

        item_id: order.item_id,
        stock_item: item?.stock_item ?? null,

        loc_id: order.loc_id,
        loc: loc?.loc ?? null,
        box_loc: loc?.box_loc ?? null,

        qty: order.actual_qty,
        unit_cost: unitCost,
        total_cost: Number(
            (unitCost * order.actual_qty).toFixed(2)
        ),
    });

    await trxRepo.save(trx);

    return savedInv;
}



//---------------------------------------
// 2) USAGE → ตัด stock แบบ FIFO (ไม่มีราคาใน order)
//---------------------------------------
async usage(
    manager: EntityManager,
    order: Orders
    ) {
    const invRepo = manager.getRepository(Inventory);
    const sumRepo = manager.getRepository(InventorySum);
    const usageRepo = manager.getRepository(OrdersUsage);
    const usageInvRepo = manager.getRepository(UsageInventory);
    const trxRepo = manager.getRepository(InventoryTrx);

    // --------------------------------------------------
    // 1) load usage
    // --------------------------------------------------
    const usage = await usageRepo.findOne({
        where: { order_id: order.order_id },
    });

    // if (!usage || !usage.sum_inv_id) {
    //     throw new Error('OrdersUsage or sum_inv_id not found');
    // }

    if (!usage) {
        throw new Error('OrdersUsage not found');
    }

    if (!order.actual_qty || order.actual_qty <= 0) {
        throw new Error('actual_qty must be > 0');
    }

    // // --------------------------------------------------
    // // 2) lock inventory_sum
    // // --------------------------------------------------
    // const sumInv = await sumRepo.findOne({
    //     where: { sum_inv_id: usage.sum_inv_id },
    //     lock: { mode: 'pessimistic_write' },
    // });

    // if (!sumInv) {
    //     throw new Error(`InventorySum not found ${usage.sum_inv_id}`);
    // }

    // if (sumInv.sum_inv_qty < order.actual_qty) {
    //     throw new Error(
    //     `Not enough stock (available=${sumInv.sum_inv_qty})`
    //     );
    // }

    // --------------------------------------------------
    // 3) load inventory FIFO (lock)
    // --------------------------------------------------
    // const inventories = await getInventoryFIFO(manager, sumInv);

    // const requiredQty = order.actual_qty;
    // let remainingQty = requiredQty;
    // let totalCostUsed = 0;

    // --------------------------------------------------
    // 4) FIFO deduction
    // --------------------------------------------------
    // for (const inv of inventories) {
    //     if (remainingQty <= 0) break;
    //     if (inv.inv_qty <= 0) continue;

    //     const deductQty = Math.min(inv.inv_qty, remainingQty);

    //     inv.inv_qty -= deductQty;
    //     inv.total_cost_inv = Number(
    //     (inv.inv_qty * inv.unit_cost_inv).toFixed(2)
    //     );

    //     if (inv.inv_qty === 0) {
    //     inv.is_active = false;
    //     }

    //     inv.updated_at = new Date();
    //     await invRepo.save(inv);

    //     // mapping usage -> inventory
    //     await usageInvRepo.save({
    //     usage_id: usage.usage_id,
    //     inv_id: inv.inv_id,
    //     usage_qty: deductQty,
    //     });

    //     // trx log
    //     await trxRepo.save({
    //     inv_id: inv.inv_id,
    //     order_id: order.order_id,
    //     order_type: TypeInfm.USAGE,
    //     item_id: inv.item_id,
    //     loc_id: inv.loc_id,
    //     qty: -deductQty,
    //     unit_cost: inv.unit_cost_inv,
    //     total_cost: Number(
    //         (-deductQty * inv.unit_cost_inv).toFixed(2)
    //     ),
    //     });

    //     remainingQty -= deductQty;
    //     totalCostUsed += deductQty * inv.unit_cost_inv;
    // }

    // if (remainingQty > 0) {
    //     throw new Error('FIFO inventory not enough (unexpected)');
    // }

    // --------------------------------------------------
    // 5) update inventory_sum
    // --------------------------------------------------
    // sumInv.sum_inv_qty -= requiredQty;
    // sumInv.total_cost_sum_inv = Number(
    //     (sumInv.total_cost_sum_inv - totalCostUsed).toFixed(2)
    // );

    // if (sumInv.sum_inv_qty < 0) {
    //     throw new Error('InventorySum qty < 0 (usage)');
    // }

    // sumInv.unit_cost_sum_inv =
    //     sumInv.sum_inv_qty > 0
    //     ? Number(
    //         (sumInv.total_cost_sum_inv / sumInv.sum_inv_qty).toFixed(2)
    //         )
    //     : 0;

    // sumInv.updated_at = new Date();
    // await sumRepo.save(sumInv);

    return true;
}




//---------------------------------------
// 3) RETURN → เพิ่ม stock (เหมือน receipt แต่ผูกกับ usage)
//---------------------------------------
async return(
    manager: EntityManager,
    order: Orders,
    inv_id: number
    ) {
    const invRepo = manager.getRepository(Inventory);
    const trxRepo = manager.getRepository(InventoryTrx);
    const returnRepo = manager.getRepository(OrdersReturn);
    const usageRepo = manager.getRepository(OrdersUsage);
    const usageInvRepo = manager.getRepository(UsageInventory);
    const returnInvRepo = manager.getRepository(ReturnInventory);
    const itemRepo = manager.getRepository(StockItems);
    const locRepo = manager.getRepository(Locations);

    if (!order.actual_qty || order.actual_qty <= 0) {
        throw new Error(`Invalid actual_qty for return order ${order.order_id}`);
    }

    if (!inv_id) {
        throw new Error(`inv_id is required`);
    }

    // ------------------------------------------------
    // 1) load orders_return
    // ------------------------------------------------
    const orderReturn = await returnRepo.findOne({
        where: { order_id: order.order_id },
    });

    if (!orderReturn || !orderReturn.usage_id) {
        throw new Error(`orders_return not found or usage_id missing`);
    }

    // ------------------------------------------------
    // 2) load usage (หลัก)
    // ------------------------------------------------
    const usage = await usageRepo.findOne({
        where: { usage_id: orderReturn.usage_id },
    });

    if (!usage) {
        throw new Error(`orders_usage ${orderReturn.usage_id} not found`);
    }

    // ------------------------------------------------
    // 3) หา usage_inventory จาก usage_id + inv_id
    // ------------------------------------------------
    const usageInv = await usageInvRepo.findOne({
        where: {
        usage_id: usage.usage_id,
        inv_id: inv_id,
        },
    });

    if (!usageInv) {
        throw new Error(
        `usage_inventory not found (usage_id=${usage.usage_id}, inv_id=${inv_id})`
        );
    }

    // ------------------------------------------------
    // 4) calculate already returned qty (per usage_inv)
    // ------------------------------------------------
    const returnedSum = await returnInvRepo
        .createQueryBuilder('ri')
        .select('COALESCE(SUM(ri.return_qty),0)', 'sum')
        .where('ri.usage_inv_id = :usageInvId', {
        usageInvId: usageInv.usage_inv_id,
        })
        .getRawOne();

    const returnedQty = Number(returnedSum.sum);
    if (usageInv.usage_qty == null) {
    throw new Error(
        `usage_inventory ${usageInv.usage_inv_id} has no usage_qty`
    );
    }

    const availableQty = usageInv.usage_qty - returnedQty;

    if (order.actual_qty > availableQty) {
        throw new Error(
        `Return qty exceeds available (${availableQty})`
        );
    }

    // ------------------------------------------------
    // 5) lock inventory
    // ------------------------------------------------
    const inv = await invRepo.findOne({
        where: { inv_id },
        lock: { mode: 'pessimistic_write' },
    });

    if (!inv) {
        throw new Error(`Inventory ${inv_id} not found`);
    }

    // ------------------------------------------------
    // 6) update inventory
    // ------------------------------------------------
    inv.inv_qty += order.actual_qty;
    inv.total_cost_inv = Number(
        (inv.inv_qty * inv.unit_cost_inv).toFixed(2)
    );
    inv.updated_at = new Date();

    await invRepo.save(inv);

    // ------------------------------------------------
    // 7) save return_inventory (detail)
    // ------------------------------------------------
    await returnInvRepo.save({
        return_id: orderReturn.return_id,
        usage_inv_id: usageInv.usage_inv_id,
        return_qty: order.actual_qty,
    });

    // ------------------------------------------------
    // 8) load display info
    // ------------------------------------------------
    const item = await itemRepo.findOne({
        where: { item_id: inv.item_id },
        select: ['stock_item'],
    });

    const loc = await locRepo.findOne({
        where: { loc_id: inv.loc_id },
    });

    // ------------------------------------------------
    // 9) insert inventory_trx (RETURN)
    // ------------------------------------------------
    const trx = Object.assign(new InventoryTrx(), {
        inv_id: inv.inv_id,
        order_id: order.order_id,
        order_type: TypeInfm.RETURN,

        item_id: inv.item_id,
        stock_item: item?.stock_item ?? null,

        loc_id: inv.loc_id,
        loc: loc?.loc ?? null,
        box_loc: loc?.box_loc ?? null,

        qty: order.actual_qty,
        unit_cost: inv.unit_cost_inv,
        total_cost: Number(
        (order.actual_qty * inv.unit_cost_inv).toFixed(2)
        ),
    });

    await trxRepo.save(trx);

    return inv;
}




//---------------------------------------
// 4) TRANSFER → ตัดจาก loc A (FIFO) + เพิ่มใน loc B ตามราคาเดิม
//---------------------------------------
async transfer(manager: EntityManager, order: Orders) {
    const invRepo = manager.getRepository(Inventory);
    const trxRepo = manager.getRepository(InventoryTrx);
    const transferRepo = manager.getRepository(OrdersTransfer);
    const stockItemRepo = manager.getRepository(StockItems);
    const locRepo = manager.getRepository(Locations);

    if (!order.actual_qty || order.actual_qty <= 0) {
        throw new Error("actual_qty must be > 0");
    }

    const t = await transferRepo.findOne({
        where: { order_id: order.order_id }
    });

    if (!t) {
        throw new Error(`OrdersTransfer not found for order ${order.order_id}`);
    }

    const fromLoc = t.from_loc_id;
    const toLoc = order.loc_id;
    const qtyToMoveTotal = order.actual_qty;

    // ----------------------------
    // lookup สำหรับ log
    // ----------------------------
    const stockItem = await stockItemRepo.findOne({
        where: { item_id: order.item_id },
        select: ['stock_item']
    });

    const fromLocInfo = await locRepo.findOne({ where: { loc_id: fromLoc } });
    const toLocInfo = await locRepo.findOne({ where: { loc_id: toLoc } });

    // ----------------------------
    // 1) ดึง inventory ต้นทาง FIFO + lock
    // ----------------------------
    const sourceList = await invRepo
        .createQueryBuilder("inv")
        .setLock("pessimistic_write")
        .where("inv.item_id = :item_id", { item_id: order.item_id })
        .andWhere("inv.loc_id = :loc_id", { loc_id: fromLoc })
        .orderBy("inv.created_at", "ASC")
        .getMany();

    if (sourceList.length === 0) {
        throw new Error(`No inventory found at from_loc_id ${fromLoc}`);
    }

    // ----------------------------
    // 2) ตรวจ stock รวม
    // ----------------------------
    const totalStock = sourceList.reduce((sum, inv) => sum + inv.inv_qty, 0);

    if (totalStock < qtyToMoveTotal) {
        throw new Error("Not enough stock to transfer");
    }

    // ----------------------------
    // 3) FIFO transfer
    // ----------------------------
    let qtyToMove = qtyToMoveTotal;

    for (const src of sourceList) {
        if (qtyToMove <= 0) break;

        const moveQty = Math.min(src.inv_qty, qtyToMove);
        qtyToMove -= moveQty;

        const unitCost = Number(src.unit_cost_inv.toFixed(2));

        // ----------------------------
        // 3.1) ตัดต้นทาง
        // ----------------------------
        src.inv_qty -= moveQty;
        src.total_cost_inv = Number(
            (src.inv_qty * unitCost).toFixed(2)
        );
        src.updated_at = new Date();
        const savedSrc = await invRepo.save(src);

        // 🔻 inventory transaction (OUT)
        await trxRepo.save(
            trxRepo.create({
                inv_id: savedSrc.inv_id,
                order_id: order.order_id,
                order_type: TypeInfm.TRANSFER,
                item_id: order.item_id,
                stock_item: stockItem?.stock_item ?? undefined,
                loc_id: fromLoc,
                loc: fromLocInfo?.loc ?? undefined,
                box_loc: fromLocInfo?.box_loc ?? undefined,
                qty: -moveQty,
                unit_cost: unitCost,
                total_cost: Number(
                    (-moveQty * unitCost).toFixed(2)
                )
            })
        );

        // ----------------------------
        // 3.2) เพิ่มปลายทาง (merge ตาม cost)
        // ----------------------------
        let dest = await invRepo.findOne({
            where: {
                item_id: order.item_id,
                loc_id: toLoc,
                unit_cost_inv: unitCost
            }
        });

        if (dest) {
            dest.inv_qty += moveQty;
            dest.total_cost_inv = Number(
                (dest.inv_qty * unitCost).toFixed(2)
            );
            dest.updated_at = new Date();
            dest = await invRepo.save(dest);
        } else {
            dest = await invRepo.save(
                invRepo.create({
                    item_id: order.item_id,
                    loc_id: toLoc,
                    unit_cost_inv: unitCost,
                    inv_qty: moveQty,
                    total_cost_inv: Number(
                        (moveQty * unitCost).toFixed(2)
                    ),
                    updated_at: new Date()
                })
            );
        }

        // 🔺 inventory transaction (IN)
        await trxRepo.save(
            trxRepo.create({
                inv_id: dest.inv_id,
                order_id: order.order_id,
                order_type: TypeInfm.TRANSFER,
                item_id: order.item_id,
                stock_item: stockItem?.stock_item ?? undefined,
                loc_id: toLoc,
                loc: toLocInfo?.loc ?? undefined,
                box_loc: toLocInfo?.box_loc ?? undefined,
                qty: moveQty,
                unit_cost: unitCost,
                total_cost: Number(
                    (moveQty * unitCost).toFixed(2)
                )
            })
        );
    }

    return true;
}



    // ดึงข้อมูลมาแสดงผลในหน้า inventory balance แบบ stock item view
    async getAll(manager?: EntityManager): Promise<ApiResponse<any[] | null>> {
        const response = new ApiResponse<any[] | null>();
        const operation = 'InventoryService.getAll';

        try {
            const repo = manager
                ? manager.getRepository(InventorySum)
                : AppDataSource.getRepository(InventorySum);

            const qb = repo
                .createQueryBuilder('sum')

                // 🔗 joins
                .leftJoin('m_stock_items', 'stock', 'stock.item_id = sum.item_id')
                .leftJoin('m_location', 'loc', 'loc.loc_id = sum.loc_id')

                // 📦 fields (กัน null ด้วย COALESCE)
                .select([
                    'sum.sum_inv_id AS sum_inv_id',
                    'sum.item_id AS item_id',
                    'sum.loc_id AS loc_id',

                    "COALESCE(sum.org_id, '-') AS org_id",
                    "COALESCE(sum.dept, '-') AS dept",
                    "COALESCE(sum.mc_code, '-') AS mc_code",
                    "COALESCE(sum.cond, '-') AS cond",

                    "COALESCE(stock.stock_item, '-') AS stock_item",
                    "COALESCE(stock.item_desc, '-') AS item_desc",
                    "COALESCE(stock.item_status, '-') AS item_status",

                    "COALESCE(loc.loc, '-') AS loc",
                    "COALESCE(loc.box_loc, '-') AS box_loc",

                    // summary values (ตัวเลขให้ default เป็น 0)
                    'COALESCE(sum.sum_inv_qty, 0) AS total_inv_qty',
                    'COALESCE(sum.total_cost_sum_inv, 0) AS total_cost_inv',
                    'COALESCE(sum.unit_cost_sum_inv, 0) AS avg_unit_cost',
                ])

                // 🔑 row key สำหรับ FE
                .addSelect(
                    `
                    CONCAT(
                        COALESCE(sum.item_id, 0), '-',
                        COALESCE(sum.loc_id, 0), '-',
                        COALESCE(sum.org_id, '-'), '-',
                        COALESCE(sum.dept, '-'), '-',
                        COALESCE(sum.mc_code, '-'), '-',
                        COALESCE(sum.cond, '-')
                    )
                    `,
                    'row_key'
                )

                .where('sum.is_active = true');

            const data = await qb.getRawMany();

            if (!data.length) {
                return response.setIncomplete(lang.msgNotFound('inventory'));
            }

            return response.setComplete(lang.msgFound('inventory'), data);

        } catch (error: any) {
            console.error(`❌ ${operation}`, error);
            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }


    // จัดกลุ่มตาม location ID ( item_id, mc_code, org_id, dept, cond, item_status )
    async getByLoc(manager?: EntityManager): Promise<ApiResponse<any | null>> {
    const response = new ApiResponse<any | null>();
    const operation = 'InventoryService.getByLoc';

    try {
        const locRepo = manager
            ? manager.getRepository(Location)
            : this.locationRepo;

        const rows = await locRepo
            .createQueryBuilder('loc')
            .leftJoin('inventory', 'inv', 'inv.loc_id = loc.loc_id')
            .leftJoin('m_stock_items', 'stock', 'stock.item_id = inv.item_id')
            .leftJoin('orders_receipt', 'receipt', 'receipt.receipt_id = inv.receipt_id')
            .leftJoin('orders', 'o', 'o.order_id = receipt.order_id')
            .select([
                // 📍 location
                'loc.loc_id AS loc_id',
                'loc.loc AS loc',
                'loc.box_loc AS box_loc',

                // 📦 inventory group key
                'inv.item_id AS item_id',
                'o.mc_code AS mc_code',
                'inv.org_id AS org_id',
                'inv.dept AS dept',
                'o.cond AS cond',
                'stock.item_status AS item_status',

                'stock.stock_item AS stock_item',
                'stock.item_desc AS item_desc',

                // 🔢 aggregate
                "GROUP_CONCAT(inv.inv_id SEPARATOR ',') AS inv_ids",
                'SUM(inv.inv_qty) AS total_inv_qty',
                'SUM(inv.total_cost_inv) AS total_cost_inv',
                'COALESCE(ROUND(SUM(inv.total_cost_inv) / NULLIF(SUM(inv.inv_qty),0),4),0) AS avg_unit_cost'
            ])
            .groupBy('loc.loc_id')
            .addGroupBy('loc.loc')
            .addGroupBy('loc.box_loc')

            .addGroupBy('inv.item_id')
            .addGroupBy('o.mc_code')
            .addGroupBy('inv.org_id')
            .addGroupBy('inv.dept')
            .addGroupBy('o.cond')
            .addGroupBy('stock.item_status')
            .getRawMany();

        // 🔄 จัดรูปแบบ nested
        const result = Object.values(
            rows.reduce((acc: any, row: any) => {
                const locKey = row.loc_id;

                if (!acc[locKey]) {
                    acc[locKey] = {
                        loc_id: row.loc_id,
                        loc: row.loc,
                        box_loc: row.box_loc,
                        items: []
                    };
                }

                // ⚠️ location ที่ไม่มี inventory → item_id จะเป็น null
                if (row.item_id !== null) {
                    acc[locKey].items.push({
                        item_id: row.item_id,
                        mc_code: row.mc_code,
                        org_id: row.org_id,
                        dept: row.dept,
                        cond: row.cond,
                        item_status: row.item_status,

                        inv_ids: row.inv_ids
                            ? row.inv_ids.split(',').map((id: string) => Number(id))
                            : [],

                        total_inv_qty: Number(row.total_inv_qty ?? 0),
                        total_cost_inv: Number(row.total_cost_inv ?? 0),
                        avg_unit_cost: Number(row.avg_unit_cost ?? 0)
                    });
                }

                return acc;
            }, {})
        );

        // ✅ list API → ไม่มีข้อมูล = array ว่าง
        return response.setComplete(lang.msgFound('inventory'), result);

    } catch (error: any) {
        console.error('Error in getByLoc:', error);

        if (error instanceof QueryFailedError) {
            return response.setIncomplete(
                lang.msgErrorFunction(operation, error.message)
            );
        }

        throw new Error(lang.msgErrorFunction(operation, error.message));
    }
}


}

