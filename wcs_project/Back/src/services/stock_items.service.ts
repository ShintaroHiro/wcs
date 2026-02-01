import { Repository, EntityManager, QueryFailedError, Not } from 'typeorm';
import { AppDataSource } from '../config/app-data-source';
import { ApiResponse } from '../models/api-response.model';
import * as lang from '../utils/LangHelper'; // Import LangHelper for specific functions
import * as validate from '../utils/ValidationUtils'; // Import ValidationUtils

import { StockItems } from '../entities/m_stock_items.entity';
import { handleFileUploads, UploadDirKey } from '../utils/filemanager';

import * as fs from "fs/promises";
import * as path from "path";
const config = require('../config/GlobalConfig.json');

const ItemFileMapping = {
    item_img: { filename: 'item_img', url: 'item_img_url', by: 'update_by' },
};

export class StockItemService {
    private itemsRepository: Repository<StockItems>;

    constructor(){
        this.itemsRepository = AppDataSource.getRepository(StockItems);
    }

    async create(
        data: Partial<StockItems>,
        files: { [key: string]: Express.Multer.File[] },
        reqUsername: string,
        manager?: EntityManager
        ): Promise<ApiResponse<any>> {

        const response = new ApiResponse<StockItems>();
        const operation = 'StockItemService.create';

        const queryRunner = manager ? null : AppDataSource.createQueryRunner();
        const useManager = manager ?? queryRunner?.manager;

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
            const repository = useManager.getRepository(StockItems);

            // ✅ validation (ก่อนทำอะไรกับ transaction)
            if (validate.isNullOrEmpty(data.stock_item)) {
            throw new Error(lang.msgRequired('stock_item.stock_item'));
            }

            // ✅ check duplicate
            const existing = await repository.findOne({
            where: [
                { stock_item: data.stock_item }
            ],
            });

            if (existing) {
            throw new Error(lang.msgAlreadyExists('stock_item.stock_item'));
            }

            // ✅ สร้าง object ใหม่ (ไม่ mutate data)
            const itemData = repository.create({
            ...data,
            is_active: data.is_active ?? true,
            requested_at: new Date(),
            requested_by: reqUsername,
            });

            // ✅ save
            const savedData = await repository.save(itemData);

            // ✅ handle file upload
            if (files && savedData?.item_id) {
            const subfolder = String(savedData.item_id);

            const updateUploadData = await handleFileUploads(
                files,
                subfolder,
                UploadDirKey.DIR_UPLOAD_ITEMS_IMAGE,
                reqUsername,
                ItemFileMapping
            );

            if (Object.keys(updateUploadData).length > 0) {
                const uploadRes = await this.updateUploadfile(
                savedData.item_id,
                updateUploadData,
                useManager
                );

                if (!uploadRes.isCompleted) {
                throw new Error(uploadRes.message);
                }
            }
            }

            if (!manager && queryRunner) {
            await queryRunner.commitTransaction();
            }

            return response.setComplete(
            lang.msgSuccessAction('created', 'stock items data'),
            savedData
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

            return response.setIncomplete(error.message);

        } finally {
            if (!manager && queryRunner) {
            await queryRunner.release();
            }
        }
    }

    async update(
        item_id: number,
        data: Partial<StockItems>,
        files: { [key: string]: Express.Multer.File[] },
        reqUsername: string,
        manager?: EntityManager
    ): Promise<ApiResponse<StockItems>> {
        const response = new ApiResponse<StockItems>();
        const operation = 'StockItemService.update';

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
            const repository = useManager.getRepository(StockItems);
            
            // หา record เดิมก่อน
            const existingData = await repository.findOne({ where: { item_id } });
            if (!existingData) {
                return response.setIncomplete(lang.msgNotFound('stock_item.item_id'));
            }

            if (validate.isNullOrEmpty(data.stock_item)) {
                return response.setIncomplete(lang.msgRequired('stock_item.stock_item'));
            }

            // ตรวจสอบว่า stock_item ไม่ซ้ำ
            if (data.stock_item && data.stock_item !== existingData.stock_item) {
                const duplicateName = await repository.findOne({
                    where: { stock_item: data.stock_item, item_id: Not(item_id) },
                });
                if (duplicateName) {
                    return response.setIncomplete(lang.msgAlreadyExists('stock_item.stock_item'));
                }
            }

            data.requested_at = new Date();
            data.requested_by = reqUsername;

            // ลบฟิลด์ item_img และ item_img_url เพื่ออัปเดตในภายหลัง
            delete data.item_img;
            delete data.item_img_url;
        
            // อัปเดตข้อมูลโรงพยาบาล
            await repository.update({ item_id }, data);
            
            // ตรวจสอบว่ามีไฟล์ที่ต้องอัปโหลดหรือไม่
            if (files && Object.keys(files).length > 0) {
                const subfolder = item_id.toString();
                const updateUploadData = await handleFileUploads(
                    files,
                    subfolder,
                    UploadDirKey.DIR_UPLOAD_ITEMS_IMAGE,
                    reqUsername,
                    ItemFileMapping
                );
        
                if (Object.keys(updateUploadData).length > 0) {
                    const updateUploadResponse = await this.updateUploadfile(item_id, updateUploadData, useManager);
                    if (!updateUploadResponse.isCompleted) {
                        throw new Error(updateUploadResponse.message);
                    }
                    //console.log('updateUploadResponse:', updateUploadResponse);
                }
            }
            
            if (!manager && queryRunner) await queryRunner.commitTransaction();

            const updated = await repository.findOne({ where: { item_id } });
            return response.setComplete(
                lang.msgSuccessAction('updated', 'stock items data'),
                updated!
            );
            
        } catch (error: any) {
            if (!manager && queryRunner) await queryRunner.rollbackTransaction();
            console.error(`Error during ${operation}:`, error);
            if (error instanceof QueryFailedError) {
                return response.setIncomplete(lang.msgErrorFunction(operation, error.message));
            }
            throw error;
        } finally {
            if (!manager && queryRunner) await queryRunner.release();
        }
    }

    async updateUploadfile(
        item_id: number,
        data: Partial<StockItems>,
        manager?: EntityManager
    ): Promise<ApiResponse<StockItems>> {

        const response = new ApiResponse<StockItems>();
        const operation = 'StockItemService.updateUploadfile';

        const useManager = manager ?? AppDataSource.manager;

        try {
            const result = manager
                ? await this.doUpdateUpload(item_id, data, useManager)
                : await useManager.transaction((tx) =>
                    this.doUpdateUpload(item_id, data, tx)
                );

            return response.setComplete(
                lang.msgSuccessAction('updated', 'stock items data'),
                result
            );

        } catch (error: any) {
            if (error?.message?.startsWith('BUSINESS:')) {
                return response.setIncomplete(error.message.replace('BUSINESS:', ''));
            }
            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }
    private async doUpdateUpload(
        item_id: number,
        data: Partial<StockItems>,
        manager: EntityManager
    ): Promise<StockItems> {

        const repository = manager.getRepository(StockItems);

        const existingItem = await repository.findOne({ where: { item_id } });
        if (!existingItem) {
            throw new Error('BUSINESS:' + lang.msgNotFound('item.outbtlitm'));
        }

        if (validate.isNullOrEmpty(data.update_by)) {
            throw new Error('BUSINESS:' + lang.msgRequiredUpdateby());
        }

        return await repository.save({
            ...existingItem,
            ...data,
        });
    }


    async delete(
        item_id: number,
        reqUsername: string,
        manager?: EntityManager
    ): Promise<ApiResponse<void>> {

        const response = new ApiResponse<void>();
        const operation = "StockItemService.delete";

        const useManager = manager ?? AppDataSource.manager;

        try {
            if (manager) {
                await this.doDelete(item_id, useManager);
            } else {
                await useManager.transaction((tx) =>
                    this.doDelete(item_id, tx)
                );
            }

            // ลบไฟล์หลัง commit
            const uploadRoot = config.PathFile[UploadDirKey.DIR_UPLOAD_ITEMS_IMAGE];
            const fullDir = path.join(process.cwd(), uploadRoot, item_id.toString());

            try {
                await fs.rm(fullDir, { recursive: true, force: true });
            } catch (err) {
                console.error("⚠ Could not delete directory:", err);
            }

            return response.setComplete(
                lang.msgSuccessAction("deleted", "stock items data")
            );

        } catch (error: any) {
            if (error?.message?.startsWith("BUSINESS:")) {
                return response.setIncomplete(
                    error.message.replace("BUSINESS:", "")
                );
            }

            console.error(`Error during ${operation}:`, error);
            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }
    private async doDelete(
        item_id: number,
        manager: EntityManager
    ): Promise<void> {

        const repository = manager.getRepository(StockItems);

        const existing = await repository.findOne({ where: { item_id } });
        if (!existing) {
            throw new Error(
                "BUSINESS:" + lang.msgNotFound("items.item_id")
            );
        }

        await repository.remove(existing);
    }

    //delete all
    async deleteAll(
        reqUsername: string,
        manager?: EntityManager
    ): Promise<ApiResponse<void>> {

        const response = new ApiResponse<void>();
        const operation = "StockItemService.deleteAll";

        const useManager = manager ?? AppDataSource.manager;

        try {
            if (manager) {
                await this.doDeleteAll(useManager);
            } else {
                await useManager.transaction((tx) =>
                    this.doDeleteAll(tx)
                );
            }

            // ลบโฟลเดอร์รูปทั้งหมดหลัง commit
            const uploadRoot =
                config.PathFile[UploadDirKey.DIR_UPLOAD_ITEMS_IMAGE];
            const fullDir = path.join(process.cwd(), uploadRoot);

            try {
                await fs.rm(fullDir, { recursive: true, force: true });
            } catch (err) {
                console.error("⚠ Could not delete upload directory:", err);
            }

            return response.setComplete(
                lang.msgSuccessAction("deleted", "all stock items data")
            );

        } catch (error: any) {
            if (error?.message?.startsWith("BUSINESS:")) {
                return response.setIncomplete(
                    error.message.replace("BUSINESS:", "")
                );
            }

            console.error(`Error during ${operation}:`, error);
            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }
    private async doDeleteAll(
        manager: EntityManager
    ): Promise<void> {

        const repository = manager.getRepository(StockItems);

        const count = await repository.count();
        if (count === 0) {
            throw new Error(
                "BUSINESS:" + lang.msgNotFound("stock items data")
            );
        }

        // ลบทั้งหมด
        await repository.clear();
    }


    async getAll(manager?: EntityManager): Promise<ApiResponse<any | null>> {
        const response = new ApiResponse<any | null>();
        const operation = 'StockItemService.getAll';

        try {
            const repository = manager ? manager.getRepository(StockItems) : this.itemsRepository;

            // Query ข้อมูลทั้งหมด
            const rawData = await repository.createQueryBuilder('items')
                .select([
                    'items.item_id AS item_id',
                    'items.stock_item AS stock_item',
                    'items.item_desc AS item_desc',
                    'items.item_img AS item_img',
                    'items.item_img_url AS item_img_url',
                    'items.mc_code AS mc_code',
                    'items.order_unit AS order_unit',
                    'items.com_group AS com_group',
                    'items.cond_en AS cond_en',
                    'items.item_status AS item_status',
                    'items.catg_code AS catg_code',
                    'items.system AS item_system',
                    "DATE_FORMAT(items.requested_at, '%d/%m/%Y') AS requested_at",
                    // ✅ ใช้ CASE WHEN เพื่อแปลงค่า is_active
                    "CASE WHEN items.is_active = 1 THEN 'ACTIVE' ELSE 'INACTIVE' END AS is_active"
                ])
                .orderBy('items.stock_item', 'ASC')
                .cache(false)
                .getRawMany();

            if (!rawData || rawData.length === 0) {
                return response.setIncomplete(lang.msgNotFound('stock items data'));
            }

            return response.setComplete(lang.msgFound('stock items data'), rawData);
        } catch (error: any) {
            console.error('Error in getAll:', error);

            if (error instanceof QueryFailedError) {
                return response.setIncomplete(lang.msgErrorFunction(operation, error.message));
            }

            throw new Error(lang.msgErrorFunction(operation, error.message));
        }
    }

    async getById(
        item_id: number,
        manager?: EntityManager
        ): Promise<ApiResponse<any | null>> {

        const response = new ApiResponse<any | null>();
        const operation = 'StockItemService.getById';

        try {
            const repository = manager
            ? manager.getRepository(StockItems)
            : this.itemsRepository;

            const rawData = await repository
            .createQueryBuilder('items')
            .select([
                'items.item_id AS item_id',
                'items.stock_item AS stock_item',
                'items.item_desc AS item_desc',
                'items.item_img AS item_img',
                'items.item_img_url AS item_img_url',
                "DATE_FORMAT(items.requested_at, '%d/%m/%Y') AS requested_at",
            ])
            .where('items.is_active = :isActive', { isActive: true })
            .andWhere('items.item_id = :item_id', { item_id }) // ✅ number
            .getRawOne();

            // ไม่พบข้อมูล
            if (!rawData) {
            return response.setIncomplete(lang.msgNotFound('item.item_id'));
            }

            return response.setComplete(
            lang.msgFound('item.item_id'),
            rawData
            );

        } catch (error: any) {
            console.error(`Error during ${operation}:`, error.message);

            if (error instanceof QueryFailedError) {
            return response.setIncomplete(
                lang.msgErrorFunction(operation, error.message)
            );
            }

            throw new Error(
            lang.msgErrorFunction(operation, error.message)
            );
        }
    }

}