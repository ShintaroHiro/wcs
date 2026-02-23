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
import { EventService } from "../utils/EventService";
import { OrdersLogService } from "../utils/logTaskEvent";
import { WrsLogService } from "../utils/LogWrsService";

export type ExecuteResult =
  | 'EXECUTED'
  | 'NO_COUNTER'
  | 'NO_AMR'
  | 'SKIPPED';

const ordersLogService = new OrdersLogService();
const eventService = new EventService();
const wrsLogService = new WrsLogService();
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
    const userRepo = useManager.getRepository(s_user);
    const locationRepo = useManager.getRepository(Locations);

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

    const user = await userRepo.findOne({
      where: { user_id: order.executed_by_user_id }
    });
    if (!user) {
      throw new Error(`User not found for order ${order.order_id}`);
    }

    const location = await locationRepo.findOne({
      where: { loc_id: order.loc_id }
    });

    /* ------------------------------------------------
     * 2) หา counter ว่าง (lock)
     * ---------------------------------------------- */
    const counter = await counterRepo.findOne({
      where: {
        status: 'EMPTY',
        light_mode: 'OFF'
      },
      order: {
        counter_id: 'ASC' // ว่างนานสุด
      },
      lock: { mode: 'pessimistic_write' }
    });

    if (!counter) {
      if (order.status !== StatusOrders.QUEUE) {
        order.status = StatusOrders.QUEUE;
        order.queued_at = new Date();
        await ordersRepo.save(order);
      }

      await ordersLogService.logTaskEvent(useManager, order, {
        status: StatusOrders.QUEUE,
        message: 'no counter available'
      });

      // ---- Log Event----
      await eventService.createEvent(useManager,{
        type: 'EVENT',
        category: 'ORDERS',
        event_code: 'ORDER_QUEUE',
        message: `User ${user.username} has started processing order(QUEUE).`,
        related_id: order.order_id,
        created_by: user.username
      });

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
      order: {
        wrs_id: 'ASC'
      },
      lock: { mode: 'pessimistic_write' }
    });

    if (!amr) {
      if (order.status !== StatusOrders.QUEUE) {
        order.status = StatusOrders.QUEUE;
        order.queued_at = new Date();
        await ordersRepo.save(order);
      }

      // ---- Log Orders----
      await ordersLogService.logTaskEvent(useManager, order, {
        status: StatusOrders.QUEUE,
        message: 'no AMR available'
      });

      if (!manager && queryRunner) {
        await queryRunner.commitTransaction();
      }

      return 'NO_AMR';
    }

    /* ------------------------------------------------
     * 4) Resolve user color
     * ---------------------------------------------- */
    if (!user.user_color_hex) {
      throw new Error(
        `User color not configured: ${order.executed_by_user_id}`
      );
    }

    /* ------------------------------------------------
     * 5) Assign order → counter → AMR
     * ---------------------------------------------- */

    // ---- Order ----
    // const previousStatus = order.status;

    order.status = StatusOrders.PROCESSING;
    order.started_at = new Date();
    await ordersRepo.save(order);

    // if (previousStatus === StatusOrders.PENDING &&
    // order.status === StatusOrders.PROCESSING){
      // ---- Log Orders----
      await ordersLogService.logTaskEvent(useManager, order, {
        status: StatusOrders.PROCESSING,
        message: 'Orders has started processing'
      });

      // ---- Log Event----
      await eventService.createEvent(useManager,{
        type: 'EVENT',
        category: 'ORDERS',
        event_code: 'ORDER_PROCESSING',
        message: `User ${user.username} has started processing order.`,
        related_id: order.order_id,
        created_by: user.username
      });
    // }
    
    // ---- Counter ----
    const isInternalInTransfer =
      order.type === 'TRANSFER' &&
      order.transfer_scenario === 'INTERNAL_IN';

    counter.status = isInternalInTransfer
      ? 'WAITING_PICK'
      : 'WAITING_AMR';

    counter.current_order_id = order.order_id;
    counter.current_wrs_id = amr.wrs_id;
    counter.light_color_hex = user.user_color_hex;
    counter.light_mode = 'ON';
    counter.last_event_at = new Date();

    await counterRepo.save(counter);

    // ---- AMR ----
    amr.wrs_status = 'MOVING';
    amr.is_available = false;
    amr.current_order_id = order.order_id;
    amr.target_counter_id = counter.counter_id;
    await wrsRepo.save(amr);

    // ---- Log WRS----
    await wrsLogService.createLog(useManager,{
      wrs_id: amr.wrs_id,
      order_id: order.order_id,
      status: 'MOVING',
      operator: ControlSource.AUTO,
      event: 'Assign order',
      message: `Assigned to AMR ${amr.wrs_code}`
    });

    if (!manager && queryRunner) {
      await queryRunner.commitTransaction();
    }

    // ---- Log Event----
    await eventService.createEvent(null,{
      type: 'EVENT',
      category: 'WRS',
      event_code: 'AMR_MOVING',
      related_id: amr.wrs_id,
      message: `AMR-${amr.wrs_code} started moving to lift bin of Binnum ${location?.box_loc ?? '-'}`,
      created_by: 'SYSTEM AMR'
    });

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


//AMR
private async mockAmrPickAndPlace(
  orderId: number,
  wrsId: number
) {
  const delay = (ms: number) =>
    new Promise(res => setTimeout(res, ms));

  setTimeout(async () => {

    /* =========================================================
     * PHASE 1: Start Delivering (Short TX)
     * =======================================================*/
    const startRunner = AppDataSource.createQueryRunner();
    await startRunner.connect();
    await startRunner.startTransaction();

    try {
      const manager = startRunner.manager;

      const wrsRepo = manager.getRepository(WRS);
      const orderRepo = manager.getRepository(Orders);
      const locRepo = manager.getRepository(Locations);
      const counterRepo = manager.getRepository(Counter);

      // 🔒 Lock order
      const order = await orderRepo.findOne({
        where: { order_id: orderId },
        lock: { mode: 'pessimistic_write' }
      });

      if (!order || order.status !== StatusOrders.PROCESSING) {
        await startRunner.rollbackTransaction();
        await startRunner.release();
        return;
      }

      // 🔒 Lock WRS
      const wrs = await wrsRepo.findOne({
        where: { wrs_id: wrsId },
        lock: { mode: 'pessimistic_write' }
      });

      if (!wrs || wrs.current_order_id !== orderId) {
        await startRunner.rollbackTransaction();
        await startRunner.release();
        return;
      }

      const location = await locRepo.findOne({
        where: { loc_id: order.loc_id }
      });

      /* -----------------------------
       * Update → DELIVERING
       * ----------------------------- */
      wrs.wrs_status = 'DELIVERING';
      wrs.last_heartbeat = new Date();
      await wrsRepo.save(wrs);

      // ---- WRS LOG ----
      await wrsLogService.createLog(manager,{
        wrs_id: wrs.wrs_id,
        order_id: order.order_id,
        status: 'DELIVERING',
        operator: ControlSource.AUTO,
        event: 'Mock pick',
        message: `Mock AMR picking from Bin Location: ${location?.box_loc ?? '-'}`
      });

      await startRunner.commitTransaction();
      await startRunner.release();

      /* -----------------------------
       * Event (outside TX)
       * ----------------------------- */
      await eventService.createEvent(null,{
        type: 'EVENT',
        category: 'WRS',
        event_code: 'AMR_DELIVERING',
        related_id: wrs.wrs_id,
        message: `AMR-${wrs.wrs_code} lifts bin of Binnum "${location?.box_loc ?? '-'}" from storage to counter`,
        created_by: 'SYSTEM AMR'
      });

    } catch (err) {
      await startRunner.rollbackTransaction();
      await startRunner.release();
      console.error('Mock AMR start error:', err);
      return;
    }

    /* =========================================================
     * Simulate Travel (NO LOCK HERE)
     * =======================================================*/
    await delay(12000);

    /* =========================================================
     * PHASE 2: Finish Delivering (Short TX)
     * =======================================================*/
    const finishRunner = AppDataSource.createQueryRunner();
    await finishRunner.connect();
    await finishRunner.startTransaction();

    try {
      const manager = finishRunner.manager;

      const wrsRepo = manager.getRepository(WRS);
      const orderRepo = manager.getRepository(Orders);
      const counterRepo = manager.getRepository(Counter);
      const locRepo = manager.getRepository(Locations);

      // 🔒 Lock order again
      const order = await orderRepo.findOne({
        where: { order_id: orderId },
        lock: { mode: 'pessimistic_write' }
      });

      if (!order || order.status !== StatusOrders.PROCESSING) {
        await finishRunner.rollbackTransaction();
        await finishRunner.release();
        return;
      }

      // 🔒 Lock WRS again
      const wrs = await wrsRepo.findOne({
        where: { wrs_id: wrsId },
        lock: { mode: 'pessimistic_write' }
      });

      if (!wrs || wrs.current_order_id !== orderId) {
        await finishRunner.rollbackTransaction();
        await finishRunner.release();
        return;
      }

      const counter = await counterRepo.findOne({
        where: { current_order_id: orderId }
      });

      const location = await locRepo.findOne({
        where: { loc_id: order.loc_id }
      });

      await finishRunner.commitTransaction();
      await finishRunner.release();

      /* -----------------------------
       * Event (outside TX)
       * ----------------------------- */
      await eventService.createEvent(null,{
        type: 'EVENT',
        category: 'WRS',
        event_code: 'AMR_DELIVERED',
        related_id: wrs.wrs_id,
        message: `AMR-${wrs.wrs_code} placed bin "${location?.box_loc ?? '-'}" at counter ${counter?.counter_id ?? '-'}`,
        created_by: 'SYSTEM AMR'
      });

    } catch (err) {
      await finishRunner.rollbackTransaction();
      await finishRunner.release();
      console.error('Mock AMR finish error:', err);
      return;
    }

  }, 0);
}


}