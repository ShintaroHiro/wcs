import { EntityManager, In, IsNull, Repository } from "typeorm";
import { AppDataSource } from "../config/app-data-source";
import { ApiResponse } from "../models/api-response.model";
import {
    StatusOrders,
    ControlSource,
} from "../common/global.enum";
import * as lang from "../utils/LangHelper";
import { OrdersLog } from "../entities/orders_log.entity";
import { Orders } from "../entities/orders.entity";
import { StockItems } from "../entities/m_stock_items.entity";
import { Locations } from "../entities/m_location.entity";
import { WRS } from "../entities/wrs.entity";
import { Counter } from "../entities/counter.entity";
import { WrsLog } from "../entities/wrs_log.entity";
import { s_user } from "../entities/s_user.entity";

export type ExecuteResult =
  | 'EXECUTED'
  | 'NO_COUNTER'
  | 'NO_AMR'
  | 'SKIPPED';

export class T1OrdersService {
    private ordersRepo: Repository<Orders>;
    private logRepo: Repository<OrdersLog>;
    private stockItemsRepo: Repository<StockItems>;
    private locationRepo: Repository<Locations>;

    constructor(){
        this.ordersRepo = AppDataSource.getRepository(Orders);
        this.logRepo = AppDataSource.getRepository(OrdersLog);
        this.stockItemsRepo = AppDataSource.getRepository(StockItems);
        this.locationRepo = AppDataSource.getRepository(Locations);
    }

//     async startExecutionService(order_id: string, reqUsername: string, manager: EntityManager) {
//         const ordersRepo = manager.getRepository(Orders);
//         const wrsRepo = manager.getRepository(WRS);
//         const counterRepo = manager.getRepository(Counter);
//         const wrsLogRepo = manager.getRepository(WrsLog);

//         // 1) โหลด order
//         const order = await ordersRepo.findOne({ where: { order_id } });
//         if (!order) throw new Error("Order not found");

//         // 2) หา AMR ที่พร้อม
//         const amr = await wrsRepo.findOne({ where: { is_available: true } });
//         if (!amr) throw new Error("No available AMR");

//         // 3) โหลด counter
//         const counter = await counterRepo.findOne({ where: { counter_id: order.target_counter_id } });
//         if (!counter) throw new Error("Counter not found");

//         // 4) อัปเดต order
//         order.status = StatusOrders.PROCESSING;
//         order.started_at = new Date();
//         await ordersRepo.save(order);

//         // 5) อัปเดต AMR
//         amr.wrs_status = "Delivering";
//         amr.current_order_id = order_id;
//         amr.is_available = false;
//         await wrsRepo.save(amr);

//         // 6) อัปเดต Counter
//         counter.status = "WAITING_AMR";
//         counter.current_order_id = order_id;
//         await counterRepo.save(counter);

//         // 7) Log
//         await wrsLogRepo.save([
//             wrsLogRepo.create({ wrs_id: amr.wrs_id, order_id, status: "Delivering", operator: ControlSource.AUTO, event: "Assigned order", message: `AMR assigned to order ${order_id}` }),
//         ]);

//         return { order_id, amr_id: amr.wrs_id, counter_id: counter.counter_id };
//     }

//     async amrDeliverBoxService(order_id: string, manager: EntityManager) {
//         const ordersRepo = manager.getRepository(Orders);
//         const wrsRepo = manager.getRepository(WRS);
//         const counterRepo = manager.getRepository(Counter);
//         const wrsLogRepo = manager.getRepository(WrsLog);

//         // 1) โหลด order
//         const order = await ordersRepo.findOne({ where: { order_id } });
//         if (!order) throw new Error("Order not found");

//         // 2) โหลด AMR
//         const amr = await wrsRepo.findOne({ where: { current_order_id: order_id } });
//         if (!amr) throw new Error("AMR not assigned");

//         // 3) โหลด counter
//         const counter = await counterRepo.findOne({ where: { current_order_id: order_id } });
//         if (!counter) throw new Error("Counter not found");

//         // 4) Simulate AMR moving
//         await wrsLogRepo.save(wrsLogRepo.create({ wrs_id: amr.wrs_id, order_id, status: "Delivering", operator: ControlSource.AUTO, event: "AMR moving to storage", message: "AMR going to storage location" }));
//         await new Promise(res => setTimeout(res, 5000)); // simulate 5 sec
//         await wrsLogRepo.save(wrsLogRepo.create({ wrs_id: amr.wrs_id, order_id, status: "Delivering", operator: ControlSource.AUTO, event: "AMR pick up box", message: "AMR picked up box" }));
//         await new Promise(res => setTimeout(res, 5000)); // simulate 5 sec
//         await wrsLogRepo.save(wrsLogRepo.create({ wrs_id: amr.wrs_id, order_id, status: "Delivering", operator: ControlSource.AUTO, event: "AMR moving to counter", message: "AMR going to counter location" }));
//         await new Promise(res => setTimeout(res, 5000)); // simulate 5 sec
//         await wrsLogRepo.save(wrsLogRepo.create({ wrs_id: amr.wrs_id, order_id, status: "Delivering", operator: ControlSource.AUTO, event: "AMR put down box", message: "AMR put down box" }));

//         // 5) AMR idle
//         amr.wrs_status = "Idle";
//         amr.current_order_id = null;
//         amr.is_available = true;
//         await wrsRepo.save(amr);

//         return { order_id, amr_id: amr.wrs_id };
//     }

// async counterReadyToPickService(order_id: string, reqUsername: string, manager: EntityManager) {
//     const counterRepo = manager.getRepository(Counter);
//     const wrsLogRepo = manager.getRepository(WrsLog);

//     // โหลด counter ที่เกี่ยวข้องกับ order
//     const counter = await counterRepo.findOne({ where: { current_order_id: order_id } });
//     if (!counter) throw new Error("Counter not found");

//     // อัปเดต counter → READY_TO_PICK
//     counter.status = "READY_TO_PICK";
//     counter.gate_open = true;
//     await counterRepo.save(counter);

//     // log event
//     await wrsLogRepo.save(wrsLogRepo.create({
//         wrs_id: counter.current_wrs_id!,
//         order_id,
//         status: "READY_TO_PICK",
//         operator: ControlSource.MANUAL,
//         event: "Counter ready to pick",
//         message: `${reqUsername} pressed 'Ready to handle item'`
//     }));

//     return { order_id, counter_id: counter.counter_id };
// }

// async confirmOrderService(order_id: string, reqUsername: string, manager: EntityManager) {
//     const ordersRepo = manager.getRepository(Orders);
//     const counterRepo = manager.getRepository(Counter);
//     const wrsLogRepo = manager.getRepository(WrsLog);

//     // โหลด order
//     const order = await ordersRepo.findOne({ where: { order_id } });
//     if (!order) throw new Error("Order not found");

//     // โหลด counter
//     const counter = await counterRepo.findOne({ where: { current_order_id: order_id } });
//     if (!counter) throw new Error("Counter not found");

//     // 1) User confirm → ปิด roller gate
//     counter.status = "WAITING_AMR";
//     counter.current_order_id = null;
//     counter.gate_open = false;
//     await counterRepo.save(counter);

//     // 2) Update order → FINISHED
//     order.status = StatusOrders.FINISHED;
//     order.finished_at = new Date();
//     await ordersRepo.save(order);

//     // log event
//     await wrsLogRepo.save(wrsLogRepo.create({
//         wrs_id: counter.current_wrs_id!,
//         order_id,
//         status: "FINISHED",
//         operator: ControlSource.MANUAL,
//         event: "Order finished",
//         message: `${reqUsername} confirmed order and closed gate`
//     }));

//     return { order_id, status: order.status, counter_id: counter.counter_id };
// }


// async amrReturnTaskService(order_id: string, manager: EntityManager) {
//     const wrsRepo = manager.getRepository(WRS);
//     const counterRepo = manager.getRepository(Counter);
//     const wrsLogRepo = manager.getRepository(WrsLog);

//     // โหลด AMR ที่ทำ order นี้
//     const amr = await wrsRepo.findOne({ where: { current_order_id: order_id } });
//     if (!amr) throw new Error("AMR not assigned");

//     // โหลด counter
//     const counter = await counterRepo.findOne({ where: { current_order_id: null } });
//     if (!counter) throw new Error("Counter not found");

//     // 1) AMR returning
//     amr.wrs_status = "Returning";
//     await wrsRepo.save(amr);

//     await wrsLogRepo.save(wrsLogRepo.create({
//         wrs_id: amr.wrs_id,
//         order_id,
//         status: "Returning",
//         operator: ControlSource.AUTO,
//         event: "AMR returning",
//         message: "AMR received returning task"
//     }));

//     // 2) AMR goes to counter → pick up → Counter empty
//     await wrsLogRepo.save(wrsLogRepo.create({ wrs_id: amr.wrs_id, order_id, status: "Returning", operator: ControlSource.AUTO, event: "AMR pick up at counter", message: "AMR picked up box" }));
//     counter.status = "Empty";
//     await counterRepo.save(counter);

//     // 3) AMR goes to storage → put down
//     await new Promise(res => setTimeout(res, 10000)); // simulate 10 sec
//     await wrsLogRepo.save(wrsLogRepo.create({ wrs_id: amr.wrs_id, order_id, status: "Returning", operator: ControlSource.AUTO, event: "AMR put down at storage", message: "AMR put down box at storage" }));

//     // 4) AMR idle
//     amr.wrs_status = "Idle";
//     amr.current_order_id = null;
//     amr.is_available = true;
//     await wrsRepo.save(amr);

//     return { order_id, amr_id: amr.wrs_id };
// }


async executeT1Order(
  order_id: number,
  manager?: EntityManager
): Promise<ExecuteResult> {

  const queryRunner = manager
    ? null
    : AppDataSource.createQueryRunner();

  const useManager = manager || queryRunner?.manager;

  if (!useManager) {
    throw new Error('No EntityManager available');
  }

  if (!manager && queryRunner) {
    await queryRunner.connect();
    await queryRunner.startTransaction();
  }

  try {
    const ordersRepo = useManager.getRepository(Orders);
    const counterRepo = useManager.getRepository(Counter);
    const wrsRepo = useManager.getRepository(WRS);
    const wrsLogRepo = useManager.getRepository(WrsLog);
    const userRepo = useManager.getRepository(s_user);

    /* ------------------------------------------------
     * 1) Load + lock order
     * ---------------------------------------------- */
    const order = await ordersRepo.findOne({
      where: {
        order_id,
        store_type: 'T1',
        status: In([
          StatusOrders.PENDING,
          StatusOrders.QUEUE
        ])
      },
      lock: { mode: 'pessimistic_write' }
    });

    if (!order) {
      return 'SKIPPED';
    }

    /* ------------------------------------------------
     * 2) หา counter ว่าง (lock)
     * ---------------------------------------------- */
    const counter = await counterRepo.findOne({
      where: {
        status: 'EMPTY',
        light_mode: 'OFF'
      },
      order: {
        last_event_at: 'ASC' // ว่างนานสุด
      },
      lock: { mode: 'pessimistic_write' }
    });

    if (!counter) {
      if (order.status !== StatusOrders.QUEUE) {
        order.status = StatusOrders.QUEUE;
        order.queued_at = new Date();
        await ordersRepo.save(order);
      }

      if (!manager && queryRunner) {
        await queryRunner.commitTransaction();
      }

      return 'NO_COUNTER';
    }

    /* ------------------------------------------------
     * 3) หา AMR ว่าง (lock)
     * ---------------------------------------------- */
    const amr = await wrsRepo.findOne({
      where: {
        wrs_status: 'IDLE',
        is_available: true
      },
      lock: { mode: 'pessimistic_write' }
    });

    if (!amr) {
      if (order.status !== StatusOrders.QUEUE) {
        order.status = StatusOrders.QUEUE;
        order.queued_at = new Date();
        await ordersRepo.save(order);
      }

      if (!manager && queryRunner) {
        await queryRunner.commitTransaction();
      }

      return 'NO_AMR';
    }

    /* ------------------------------------------------
     * 4) Resolve user color
     * ---------------------------------------------- */
    const user = await userRepo.findOne({
      where: { user_id: order.executed_by_user_id }
    });

    if (!user?.user_color_hex) {
      throw new Error(
        `User color not configured: ${order.executed_by_user_id}`
      );
    }

    /* ------------------------------------------------
     * 5) Assign order → counter → AMR
     * ---------------------------------------------- */

    // ---- Order ----
    order.status = StatusOrders.PROCESSING;
    order.started_at = new Date();
    await ordersRepo.save(order);

    // ---- Counter ----
    counter.status = 'WAITING_AMR';
    counter.current_order_id = order.order_id;
    counter.current_wrs_id = amr.wrs_id;
    counter.light_color_hex = user.user_color_hex;
    counter.light_mode = 'ON';
    counter.last_event_at = new Date();
    await counterRepo.save(counter);

    // ---- AMR ----
    amr.wrs_status = 'DELIVERING';
    amr.is_available = false;
    amr.current_order_id = order.order_id;
    amr.target_counter_id = counter.counter_id;
    await wrsRepo.save(amr);

    // ---- Log ----
    await wrsLogRepo.save(
      wrsLogRepo.create({
        wrs_id: amr.wrs_id,
        order_id: order.order_id,
        status: 'MOVING',
        operator: ControlSource.AUTO,
        event: 'Assign order',
        message: `Assigned to AMR ${amr.wrs_code}`
      })
    );

    if (!manager && queryRunner) {
      await queryRunner.commitTransaction();
    }

    /* ------------------------------------------------
     * 6) Trigger AMR (outside transaction)
     * ---------------------------------------------- */
    this.mockAmrPickAndPlace(
      order.order_id,
      amr.wrs_id
    );

    return 'EXECUTED';

  } catch (error) {

    if (!manager && queryRunner) {
      await queryRunner.rollbackTransaction();
    }

    throw error;

  } finally {
    if (!manager && queryRunner) {
      await queryRunner.release();
    }
  }
}

private async mockAmrPickAndPlace(
    orderId: number,
    wrsId: number
) {
    const delay = (ms: number) =>
        new Promise(res => setTimeout(res, ms));

    setTimeout(async () => {
        const manager = AppDataSource.manager;

        const wrsRepo = manager.getRepository(WRS);
        const wrsLogRepo = manager.getRepository(WrsLog);
        const orderRepo = manager.getRepository(Orders);
        const locRepo = manager.getRepository(Locations);

        const order = await orderRepo.findOne({
            where: { order_id: orderId }
        });
        if (!order) return;

        const wrs = await wrsRepo.findOne({
            where: { wrs_id: wrsId }
        });
        if (!wrs) return;

        const location = await locRepo.findOne({
            where: { loc_id: order.loc_id }
        });

        /* -----------------------------------------
         * 1) LOG: Start Delivering
         * ----------------------------------------- */
        await wrsLogRepo.save(
            wrsLogRepo.create({
                wrs_id: wrs.wrs_id,
                order_id: order.order_id,
                status: 'DELIVERING',
                operator: ControlSource.AUTO,
                event: 'Mock pick',
                message: `Mock AMR picking from ${location?.loc ?? '-'}`
            })
        );

        console.log(`[MOCK-AMR] Picking item from`, {
            loc: location?.loc,
            box_loc: location?.box_loc
        });

        await delay(12000); // simulate AMR travel

        console.log(`[MOCK-AMR] Delivered order ${orderId} to counter`);

        /* -----------------------------------------
         * 2) LOG: Delivered
         * ----------------------------------------- */
        await wrsLogRepo.save(
            wrsLogRepo.create({
                wrs_id: wrs.wrs_id,
                order_id: order.order_id,
                status: 'IDLE',
                operator: ControlSource.AUTO,
                event: 'Mock deliver completed',
                message: `Mock AMR delivered order ${order.order_id}`
            })
        );

        /* -----------------------------------------
         * 3) Reset WRS
         * ----------------------------------------- */
        await wrsRepo.update(
            { wrs_id: wrsId },
            {
                wrs_status: 'IDLE',
                is_available: true,
                current_order_id: null,
                target_counter_id: null
            }
        );

    }, 0);
}


}