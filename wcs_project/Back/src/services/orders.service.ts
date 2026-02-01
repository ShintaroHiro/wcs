import { Repository, EntityManager, Not, QueryFailedError, In } from 'typeorm';
import { AppDataSource } from '../config/app-data-source';
import { ApiResponse } from '../models/api-response.model';
import * as lang from '../utils/LangHelper'; // Import LangHelper for specific functions
import * as validate from '../utils/ValidationUtils'; // Import ValidationUtils

import { Orders } from '../entities/orders.entity';
import { ScanStatus, StatusOrders, TypeInfm } from '../common/global.enum';
import { OrdersLog } from '../entities/orders_log.entity';
import { T1MOrdersService } from './order_mrs.service';
import { OrdersLogService } from '../utils/logTaskEvent';
import { REPLCommand } from 'repl';
import { StockItems } from '../entities/m_stock_items.entity';
import { OrdersUsage } from '../entities/order_usage.entity';
import { OrdersReceipt } from '../entities/order_receipt.entity';
import { OrdersTransfer } from '../entities/order_transfer.entity';
import { Locations } from '../entities/m_location.entity';
import { s_user } from '../entities/s_user.entity';
import { OrdersReturn } from '../entities/order_return.entity';

interface CreateOrderBatchInput extends Partial<Orders> {
    type: TypeInfm;          // 👈 type เดียวกันทั้งชุด
    items: CreateOrderItemInput[];
}
interface CreateOrderItemInput {
    item_id: number;
    mc_code: string;
    loc_id: number;

    usage?: Partial<OrdersUsage>;
    receipt?: Partial<OrdersReceipt>;
    return?: Partial<OrdersReturn>;
    transfer?: Partial<OrdersTransfer>;
}


export interface UpdateOrderBatchInput extends Partial<Orders> {
    items: UpdateOrderItemInput[];
}
export interface UpdateOrderItemInput {
    order_id: number;          // 👈 ต้องรู้ว่าแก้ order ไหน

    item_id?: number;
    mc_code?: string;
    loc_id?: number;

    usage?: Partial<OrdersUsage>;
    receipt?: Partial<OrdersReceipt>;
    return?: Partial<OrdersReturn>;
    transfer?: Partial<OrdersTransfer>;
}

export class OrdersService {
    private ordersRepository: Repository<Orders>;
    private logRepository: Repository<OrdersLog>;
    private stockItemsRepository: Repository<StockItems>;
    private locationRepository: Repository<Locations>;
    private userRepository: Repository<s_user>;

    constructor(){
        this.ordersRepository = AppDataSource.getRepository(Orders);
        this.logRepository = AppDataSource.getRepository(OrdersLog);
        this.stockItemsRepository = AppDataSource.getRepository(StockItems);
        this.locationRepository = AppDataSource.getRepository(Locations);
        this.userRepository = AppDataSource.getRepository(s_user);
    }

    private async createSubTableByType(
        manager: EntityManager,
        type: TypeInfm,
        item: CreateOrderItemInput,
        orderId: number
        ) {
        switch (type) {
            case TypeInfm.USAGE:
            await manager.getRepository(OrdersUsage).save({
                ...item.usage,
                order_id: orderId
            });
            break;

            case TypeInfm.RECEIPT:
            await manager.getRepository(OrdersReceipt).save({
                ...item.receipt,
                order_id: orderId
            });
            break;

            case TypeInfm.RETURN:
            await manager.getRepository(OrdersReturn).save({
                ...item.return,
                order_id: orderId
            });
            break;

            case TypeInfm.TRANSFER:
            await manager.getRepository(OrdersTransfer).save({
                ...item.transfer,
                order_id: orderId
            });
            break;
        }
    }

    async create(
        data: CreateOrderBatchInput,
        reqUsername: string,
        manager?: EntityManager
        ): Promise<ApiResponse<any>> {

        const response = new ApiResponse<Orders[]>();
        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager || queryRunner?.manager;

        if (!useManager) {
            return response.setIncomplete('no entity manager');
        }

        if (!manager && queryRunner) {
            await queryRunner.connect();
            await queryRunner.startTransaction();
        }

        try {
            const repository = useManager.getRepository(Orders);

            // ✅ validate type แค่ครั้งเดียว
            if (validate.isNullOrEmpty(data.type)) {
            return response.setIncomplete(lang.msgRequired('item.type'));
            }

            const user = await this.userRepository.findOne({ where: { username: reqUsername } });
            if (!user) {
            return response.setIncomplete('user not found');
            }

            const results: Orders[] = [];

            for (const item of data.items) {
            // --- validate ราย item ---
            if (item.item_id == null) { // null หรือ undefined เท่านั้น
                throw new Error('stock item required');
            }
            if (validate.isNullOrEmpty(item.mc_code)) {
                throw new Error('Maintenance Contract required');
            }
            if (item.loc_id == null) {
                throw new Error('Location required');
            }

            const existingStockItem = await this.stockItemsRepository.findOne({ where: { item_id: item.item_id }});
            if (!existingStockItem) {
                throw new Error('stock item not found');
            }

            const existingLocation = await this.locationRepository.findOne({ where: { loc_id: item.loc_id }});
            if (!existingLocation) {
                throw new Error('location not found');
            }

            const cleanedData: Partial<Orders> = {
                ...item,
                type: data.type,
                requested_at: new Date(),
                requested_by: reqUsername,
                created_by_user_id: user.user_id,
                store_type: existingLocation.store_type
            };

            const order = repository.create(cleanedData);
            const savedOrder = await repository.save(order);

            // --- save sub table ---
            await this.createSubTableByType(
                useManager,
                data.type,
                item,
                savedOrder.order_id
            );

            // ✅ log ต่อ order
            const logService = new OrdersLogService();
            await logService.logTaskEvent(
                useManager,
                savedOrder,
                {
                    actor: reqUsername,
                    status: StatusOrders.WAITING
                }
            );

            results.push(savedOrder);
            }

            if (!manager && queryRunner) await queryRunner.commitTransaction();
            return response.setComplete('created', results);

        } catch (e) {
            if (!manager && queryRunner) await queryRunner.rollbackTransaction();
            throw e;
        } finally {
            if (!manager && queryRunner) await queryRunner.release();
        }
    }

    private async updateSubTableByType(
        manager: EntityManager,
        type: TypeInfm,
        item: UpdateOrderItemInput,
        orderId: number
        ) {
        switch (type) {
            case TypeInfm.USAGE: {
            if (!item.usage) return;
            const repo = manager.getRepository(OrdersUsage);
            const existing = await repo.findOne({ where: { order_id: orderId } });
            if (!existing) throw new Error('usage not found');
            repo.merge(existing, item.usage);
            await repo.save(existing);
            break;
            }

            case TypeInfm.RECEIPT: {
            if (!item.receipt) return;
            const repo = manager.getRepository(OrdersReceipt);
            const existing = await repo.findOne({ where: { order_id: orderId } });
            if (!existing) throw new Error('receipt not found');
            repo.merge(existing, item.receipt);
            await repo.save(existing);
            break;
            }

            case TypeInfm.RETURN: {
            if (!item.return) return;
            const repo = manager.getRepository(OrdersReturn);
            const existing = await repo.findOne({ where: { order_id: orderId } });
            if (!existing) throw new Error('return not found');
            repo.merge(existing, item.return);
            await repo.save(existing);
            break;
            }

            case TypeInfm.TRANSFER: {
            if (!item.transfer) return;
            const repo = manager.getRepository(OrdersTransfer);
            const existing = await repo.findOne({ where: { order_id: orderId } });
            if (!existing) throw new Error('transfer not found');
            repo.merge(existing, item.transfer);
            await repo.save(existing);
            break;
            }
        }
    }

    async update(
        data: UpdateOrderBatchInput,
        reqUsername: string,
        manager?: EntityManager
        ): Promise<ApiResponse<Orders[]>> {

        const response = new ApiResponse<Orders[]>();
        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager || queryRunner?.manager;

        if (!useManager) {
            return response.setIncomplete('no entity manager');
        }

        if (!manager && queryRunner) {
            await queryRunner.connect();
            await queryRunner.startTransaction();
        }

        try {
            const repository = useManager.getRepository(Orders);
            const results: Orders[] = [];

            for (const item of data.items) {
            const existing = await repository.findOne({
                where: { order_id: item.order_id }
            });

            if (!existing) {
                throw new Error(`order ${item.order_id} not found`);
            }

            // 🔒 type immutable
            const type = existing.type;

            // validate เฉพาะ field ที่ส่งมา
            if (item.loc_id) {
                const loc = await this.locationRepository.findOne({
                where: { loc_id: item.loc_id }
                });
                if (!loc) throw new Error('location not found');
                existing.store_type = loc.store_type;
            }

            const cleanedData: Partial<Orders> = {
                ...item,
                updated_at: new Date(),
                requested_by: reqUsername
            };

            // ป้องกัน type หลุด
            delete (cleanedData as any).type;
            delete (cleanedData as any).order_id;

            repository.merge(existing, cleanedData);
            const savedOrder = await repository.save(existing);

            // update sub-table
            await this.updateSubTableByType(
                useManager,
                type,
                item,
                savedOrder.order_id
            );

            // ✅ log ตรงนี้ (ดีที่สุด)
            const logService = new OrdersLogService();
            await logService.logTaskEvent(
                useManager,
                savedOrder,
                {
                    actor: reqUsername,
                    status: StatusOrders.WAITING
                }
            );

            results.push(savedOrder);
            }

            if (!manager && queryRunner) await queryRunner.commitTransaction();
            return response.setComplete('updated', results);

        } catch (e) {
            if (!manager && queryRunner) await queryRunner.rollbackTransaction();
            throw e;
        } finally {
            if (!manager && queryRunner) await queryRunner.release();
        }
    }

    async delete(
        order_ids: number[],
        reqUsername: string,
        manager?: EntityManager
    ): Promise<ApiResponse<void>> {

        const response = new ApiResponse<void>();
        const operation = 'OrdersService.delete';

        if (!order_ids || order_ids.length === 0) {
            return response.setIncomplete('order_ids is required');
        }

        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager || queryRunner?.manager;

        if (!useManager) {
            return response.setIncomplete(
                lang.msg('validation.no_entityManager_or_queryRunner_available')
            );
        }

        if (!manager && queryRunner) {
            await queryRunner.connect();
            await queryRunner.startTransaction();
        }

        try {
            const repository = useManager.getRepository(Orders);

            // -------------------------------
            // 1. ดึง order ทั้งหมดที่ต้องการลบ
            // -------------------------------
            const orders = await repository.find({
                where: {
                    order_id: In(order_ids),
                },
            });

            // ตรวจว่าครบทุก id ไหม
            if (orders.length !== order_ids.length) {
                return response.setIncomplete('Some orders were not found.');
            }

            // ตรวจสอบสถานะ ต้องเป็น WAITING ทุกตัว
            const invalidOrders = orders.filter(
                o => o.status !== StatusOrders.WAITING
            );

            if (invalidOrders.length > 0) {
                return response.setIncomplete(
                    'Some orders cannot be deleted because they have already started.'
                );
            }

            const logService = new OrdersLogService();

            // -------------------------------
            // 2. ลบทีละ order
            // -------------------------------
            for (const order of orders) {

                // LOG DELETE
                await logService.logTaskEvent(
                    useManager,
                    order,
                    {
                        actor: reqUsername,
                        status: StatusOrders.DELETE,
                    }
                );

                // DELETE SUB TABLE BY TYPE
                switch (order.type) {
                    case TypeInfm.USAGE:
                        await useManager
                            .getRepository(OrdersUsage)
                            .delete({ order_id: order.order_id });
                        break;

                    case TypeInfm.RECEIPT:
                        await useManager
                            .getRepository(OrdersReceipt)
                            .delete({ order_id: order.order_id });
                        break;

                    case TypeInfm.RETURN:
                        await useManager
                            .getRepository(OrdersReturn)
                            .delete({ order_id: order.order_id });
                        break;

                    case TypeInfm.TRANSFER:
                        await useManager
                            .getRepository(OrdersTransfer)
                            .delete({ order_id: order.order_id });
                        break;
                }
            }

            // -------------------------------
            // 3. ลบ main orders ทีเดียว
            // -------------------------------
            await repository.remove(orders);

            if (!manager && queryRunner) {
                await queryRunner.commitTransaction();
            }

            return response.setComplete(
                lang.msgSuccessAction('deleted', 'item.waiting')
            );

        } catch (error: any) {

            if (!manager && queryRunner) {
                await queryRunner.rollbackTransaction();
            }

            console.error(`Error during ${operation}:`, error);

            if (error instanceof QueryFailedError) {
                return response.setIncomplete(
                    lang.msgErrorFunction(operation, error.message)
                );
            }

            throw new Error(
                lang.msgErrorFunction(operation, error.message)
            );

        } finally {
            if (!manager && queryRunner) {
                await queryRunner.release();
            }
        }
    }

    async submitReturn(
        order_ids: number[],
        reqUsername: string,
        manager?: EntityManager
    ): Promise<ApiResponse<any>> {

        const response = new ApiResponse<any>();
        const operation = 'OrdersService.submitReturn';

        if (!order_ids || order_ids.length === 0) {
            return response.setIncomplete('order_ids is required');
        }

        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager || queryRunner?.manager;

        if (!useManager) {
            return response.setIncomplete(
                lang.msg('validation.no_entityManager_or_queryRunner_available')
            );
        }

        if (!manager && queryRunner) {
            await queryRunner.connect();
            await queryRunner.startTransaction();
        }

        try {
            const orderRepo = useManager.getRepository(Orders);
            const userRepo = useManager.getRepository(s_user);

            /** ---------- หา user ---------- */
            const user = await userRepo.findOne({
                where: { username: reqUsername },
            });

            if (!user) {
                throw new Error(lang.msgNotFound('user'));
            }

            const updatedOrders: Orders[] = [];

            /** ---------- loop order ---------- */
            for (const order_id of order_ids) {

                const order = await orderRepo.findOne({
                    where: { order_id },
                });

                if (!order) {
                    throw new Error(
                        lang.msgNotFound(`orders.order_id : ${order_id}`)
                    );
                }

                if (order.status === StatusOrders.COMPLETED) {
                    // ข้าม หรือจะ throw ก็ได้ (เลือก policy)
                    continue;
                }

                await orderRepo.update(
                    { order_id },
                    {
                        status: StatusOrders.COMPLETED,
                        actual_qty: order.plan_qty,
                        actual_status: ScanStatus.COMPLETED,
                        actual_by: reqUsername,
                        is_confirm: true,
                        finished_at: new Date(),
                        executed_by_user_id: user.user_id,
                    }
                );

                const updated = await orderRepo.findOne({
                    where: { order_id },
                });

                if (updated) {
                    updatedOrders.push(updated);
                }
            }

            if (!manager && queryRunner) {
                await queryRunner.commitTransaction();
            }

            return response.setComplete(
                'submit return completed',
                updatedOrders
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


    async getAll(manager?: EntityManager): Promise<ApiResponse<any | null>> {
        const response = new ApiResponse<any | null>();
        const operation = 'OrdersService.getAll';

        try {
            const repository = manager ? manager.getRepository(Orders) : this.ordersRepository;

            // Query order ข้อมูลทั้งหมดในรูปแบบ raw data
            const rawData = await repository.createQueryBuilder('o')
                .leftJoin('m_stock_items', 'stock', 'stock.item_id = o.item_id')
                .leftJoin('m_location', 'loc', 'loc.loc_id = o.loc_id')
                .select([
                    'o.order_id AS order_id',
                    'o.type AS type',
                    'o.mc_code AS mc_code',
                    'stock.item_id AS item_id',
                    'stock.stock_item As stock_item',
                    'stock.item_desc AS item_desc',
                    'loc.loc_id AS loc_id',
                    'loc.loc AS loc',
                    'loc.box_loc AS box_loc',
                    'o.cond AS cond',
                    'o.status AS status',
                    "DATE_FORMAT(o.requested_at, '%d/%m/%Y') AS requested_at",
                    "o.plan_qty AS plan_qty",
                    "o.actual_qty AS actual_qty",
                ])
                .where('o.status = :status', { status: StatusOrders.WAITING })
                .orderBy('o.requested_at', 'ASC') // ✅ เรียงจากเก่ามาใหม่
                .cache(false) // ✅ ปิด Query Cache
                .getRawMany();

            // หากไม่พบข้อมูล
            if (!rawData || rawData.length === 0) {
                return response.setIncomplete(lang.msgNotFound('item.waiting'));
            }

            // ส่งข้อมูลกลับในรูปแบบ response
            return response.setComplete(lang.msgFound('item.waiting'), rawData);
        } catch (error: any) {
            console.error('Error in getAll:', error);

            if (error instanceof QueryFailedError) {
                return response.setIncomplete(lang.msgErrorFunction(operation, error.message));
            }

            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }

    async getUsageAll(manager?: EntityManager): Promise<ApiResponse<any | null>> {
        const response = new ApiResponse<any | null>();
        const operation = 'OrdersService.getUsageAll';

        try {
            const repository = manager ? manager.getRepository(Orders) : this.ordersRepository;

            const rawData = await repository.createQueryBuilder('o')
                .leftJoin('orders_usage', 'usage', 'usage.order_id = o.order_id')
                .leftJoin('m_stock_items', 'stock', 'stock.item_id = o.item_id')
                .leftJoin('m_location', 'loc', 'loc.loc_id = o.loc_id')
                .select([
                    'o.order_id AS order_id',
                    'o.type AS type',
                    'o.status AS status',
                    'usage.usage_id AS usage_id',
                    'usage.work_order AS work_order',
                    'usage.usage_num AS usage_num',
                    'usage.usage_line AS usage_line',
                    'usage.usage_type AS usage_type',
                    'usage.split AS split',
                    'stock.item_id AS item_id',
                    'stock.stock_item AS stock_item',
                    'loc.loc_id AS loc_id',
                    'loc.loc AS loc',
                    'loc.box_loc AS box_loc',
                    'loc.store_type AS store_type',
                    'o.cond AS cond',
                    'o.plan_qty AS plan_qty',
                    'o.actual_qty AS actual_qty',
                    'o.is_confirm AS is_confirm',
                    'o.requested_by AS requested_by',
                    "DATE_FORMAT(o.requested_at, '%d/%m/%Y') AS requested_at",
                ])
                .where('o.type = :type', { type: TypeInfm.USAGE })
                .orderBy('o.requested_at', 'ASC')
                .cache(false)
                .getRawMany();

            if (!rawData || rawData.length === 0) {
                return response.setIncomplete(lang.msgNotFound('field.usage'));
            }

            // ✅ บังคับให้ actual_qty และ is_confirm เป็น 0 ถ้าไม่มีค่า
            const cleanedData = rawData.map((item: any) => ({
                ...item,
                actual_qty: item.actual_qty != null && !isNaN(Number(item.actual_qty)) ? Number(item.actual_qty) : 0,
                is_confirm: item.is_confirm != null && !isNaN(Number(item.is_confirm)) ? Number(item.is_confirm) : 0,
            }));

            return response.setComplete(lang.msgFound('field.usage'), cleanedData);
        } catch (error: any) {
            console.error('Error in getUsageAll:', error);

            if (error instanceof QueryFailedError) {
                return response.setIncomplete(lang.msgErrorFunction(operation, error.message));
            }

            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }

    async getUsageById(order_id: number, manager?: EntityManager): Promise<ApiResponse<any | null>> {
        const response = new ApiResponse<any | null>();
        const operation = 'OrdersService.getUsageById';

        try {
            const repository = manager ? manager.getRepository(Orders) : this.ordersRepository;

            const rawData = await repository.createQueryBuilder('o')
                .leftJoin('orders_usage', 'usage', 'usage.order_id = o.order_id')
                .leftJoin('m_stock_items', 'stock', 'stock.item_id = o.item_id')
                .leftJoin('m_location', 'loc', 'loc.loc_id = o.loc_id')
                .select([
                    'o.order_id AS order_id',
                    'o.type AS type',
                    'o.status AS status',
                    'o.mc_code AS mc_code',

                    'usage.usage_id AS usage_id',
                    'usage.work_order AS work_order',
                    'usage.usage_num AS usage_num',
                    'usage.usage_line AS usage_line',
                    'usage.usage_type AS usage_type',
                    'usage.split AS split',

                    'stock.item_id AS item_id',
                    'stock.stock_item AS stock_item',

                    'loc.loc_id AS loc_id',
                    'loc.loc AS loc',
                    'loc.box_loc AS box_loc',

                    'o.plan_qty AS plan_qty',
                    'o.cond AS cond',
                ])
                .where('o.order_id = :order_id', { order_id })
                .andWhere('o.type = :type', { type: TypeInfm.USAGE })
                .getRawOne();

            if (!rawData)
                return response.setIncomplete(lang.msgNotFound('order.order_id'));

            return response.setComplete(lang.msgFound('order.order_id'), rawData);

        } catch (error: any) {
            console.error(`Error during ${operation}:`, error.message);
            if (error instanceof QueryFailedError)
                return response.setIncomplete(lang.msgErrorFunction(operation, error.message));

            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }

    async getReceiptAll(manager?: EntityManager): Promise<ApiResponse<any | null>> {
        const response = new ApiResponse<any | null>();
        const operation = 'OrdersService.getReceiptAll';

        try {
            const repository = manager ? manager.getRepository(Orders) : this.ordersRepository;

            const rawData = await repository.createQueryBuilder('o')
                .leftJoin('orders_receipt', 'receipt', 'receipt.order_id = o.order_id')
                .leftJoin('m_stock_items', 'stock', 'stock.item_id = o.item_id')
                .leftJoin('m_location', 'loc', 'loc.loc_id = o.loc_id')
                .select([
                    'o.order_id AS order_id',
                    'o.type AS type',
                    'o.status AS status',
                    'stock.item_id AS item_id',
                    'stock.stock_item AS stock_item',
                    'stock.item_desc AS item_desc',
                    'loc.loc_id AS loc_id',
                    'loc.loc AS loc',
                    'loc.box_loc AS box_loc',
                    'loc.store_type AS store_type',
                    'receipt.receipt_id AS receipt_id',
                    'receipt.unit_cost_handled AS unit_cost_handled',
                    'receipt.contract_num AS contract_num',
                    'receipt.po_num AS po_num',
                    'receipt.object_id AS object_id',
                    'o.cond AS cond',
                    'o.plan_qty AS plan_qty',
                    'o.actual_qty AS actual_qty',
                    'o.is_confirm AS is_confirm',
                    'o.requested_by AS requested_by',
                    "DATE_FORMAT(o.requested_at, '%d/%m/%Y') AS requested_at",
                ])
                .where('o.type = :type', { type: TypeInfm.RECEIPT })
                .orderBy('o.requested_at', 'ASC')
                .cache(false)
                .getRawMany();

            if (!rawData || rawData.length === 0) {
                return response.setIncomplete(lang.msgNotFound('field.receipt'));
            }

            // หลังจากดึง rawData แล้ว
            const cleanedData = rawData.map((item: any) => ({
                ...item,
                actual_qty: item.actual_qty != null && !isNaN(Number(item.actual_qty)) ? Number(item.actual_qty) : 0,
                is_confirm: item.is_confirm != null && !isNaN(Number(item.is_confirm)) ? Number(item.is_confirm) : 0,
                total_cost_handled:
                    Number(item.unit_cost_handled ?? 0) * Number(item.plan_qty ?? 0)
            }));

            return response.setComplete(lang.msgFound('field.receipt'), cleanedData);
        } catch (error: any) {
            console.error('Error in getReceiptAll:', error);

            if (error instanceof QueryFailedError) {
                return response.setIncomplete(lang.msgErrorFunction(operation, error.message));
            }

            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }

    async getReceiptById(order_id: number, manager?: EntityManager): Promise<ApiResponse<any | null>> {
        const response = new ApiResponse<any | null>();
        const operation = 'OrdersService.getReceiptById';

        try {
            const repository = manager ? manager.getRepository(Orders) : this.ordersRepository;


            // Query o ข้อมูลทั้งหมดในรูปแบบ raw data
            const rawData = await repository.createQueryBuilder('o')
                .leftJoin('orders_receipt', 'receipt', 'receipt.order_id = o.order_id')
                .leftJoin('m_stock_items', 'stock', 'stock.item_id = o.item_id')
                .leftJoin('m_location', 'loc', 'loc.loc_id = o.loc_id')
                .select([
                    'o.order_id AS order_id',
                    'o.type AS type',
                    'o.status AS status',
                    'o.mc_code AS mc_code',
                    'o.cond AS cond',
                    'o.plan_qty AS plan_qty',

                    'stock.item_id AS item_id',
                    'stock.stock_item AS stock_item',

                    'loc.loc_id AS loc_id',
                    'loc.loc AS loc',
                    'loc.box_loc AS box_loc',

                    'receipt.receipt_id AS receipt_id',
                    'receipt.contract_num AS contract_num',
                    'receipt.unit_cost_handled AS unit_cost_handled',
                    'receipt.po_num AS po_num',
                    'receipt.object_id AS object_id',
                ])
                .where('o.order_id = :order_id', { order_id })
                .andWhere('o.type = :type', { type: TypeInfm.RECEIPT })
                .getRawOne();

            // หากไม่พบข้อมูล
            if (!rawData) {
                return response.setIncomplete(lang.msgNotFound('order.order_id'));
            }

            // ส่งข้อมูลกลับในรูปแบบ response
            return response.setComplete(lang.msgFound('order.order_id'), rawData);
        } catch (error: any) {
            console.error(`Error during ${operation}:`, error.message);
            if (error instanceof QueryFailedError) {
                return response.setIncomplete(lang.msgErrorFunction(operation, error.message));
            }
    
            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }

    async getMcCodeDropdown(manager?: EntityManager): Promise<ApiResponse<any>> {
        const response = new ApiResponse<any>();
        const operation = 'OrdersService.getMcCodeDropdown';

        try {
            const repository = manager
                ? manager.getRepository(Orders)
                : this.ordersRepository;

            const rawData = await repository
                .createQueryBuilder('o')
                .select('o.mc_code', 'mc_code')
                .where('o.mc_code IS NOT NULL')
                .andWhere("o.mc_code <> ''")
                .distinct(true)
                .orderBy('o.mc_code', 'ASC')
                .getRawMany();

            if (!rawData || rawData.length === 0) {
                return response.setIncomplete(
                    lang.msgNotFound('item.mc_code')
                );
            }

            const data = rawData.map(r => ({
                value: r.mc_code,
                text: r.mc_code
            }));

            return response.setComplete(
                lang.msgFound('item.mc_code'),
                data
            );
        } catch (error: any) {
            console.error(`Error in ${operation}`, error);
            throw new Error(
                lang.msgErrorFunction(operation, error.message)
            );
        }
    }


}