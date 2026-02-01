import { Request, Response } from 'express';
import dotenv from 'dotenv';
import ResponseUtils, { HttpStatus } from '../utils/ResponseUtils';
import * as lang from '../utils/LangHelper'; // ใช้ helper function
import { DataSanitizer } from '../utils/DataSanitizer'; // นำเข้า DataSanitizer
import RequestUtils from '../utils/RequestUtils'; // Import the utility class

import { StockItemService } from '../services/stock_items.service';
import { StockItems } from '../entities/m_stock_items.entity';

dotenv.config();

const stockItemService = new StockItemService();

export const create = async (req: Request, res: Response) => {
    const operation = 'StockItemController.create';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    try {  
        //console.log('Raw req.body:', req.body);

        // Sanitization ข้อมูลจาก req.body
        const data: Partial<StockItems> = DataSanitizer.fromObject<StockItems>(req.body, StockItems);
        
        const files = req.files as { [key: string]: Express.Multer.File[] };
        //console.log('files:', files);

        const response = await stockItemService.create(data, files, reqUsername);

        return ResponseUtils.handleCustomResponse(res, response, HttpStatus.CREATED);

    } catch (error: any) {
        // Log ข้อผิดพลาด
        console.error(`Error during ${operation}:`, error);

        // จัดการข้อผิดพลาดและส่ง response
        return ResponseUtils.handleErrorCreate(res, operation, error.message, 'item.items', true, reqUsername);
    }
};

export const update = async (req: Request, res: Response) => {
    const operation = 'StockItemController.update';

    // ดึง username ของผู้ทำการอัปเดตจาก token
    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    // รับ item_id จากพารามิเตอร์
    const item_id_str = req.params.item_id;
    const item_id = Number(item_id_str);
    if (isNaN(item_id)) {
        return ResponseUtils.handleBadRequest(res, lang.msgInvalidParameter());
    }


    try {
        // ทำ sanitize ข้อมูลจาก body
        const data: Partial<StockItems> = DataSanitizer.fromObject<StockItems>(req.body, StockItems);
        
        const files = req.files as { [key: string]: Express.Multer.File[] };
        //console.log('files:', files);

        // เรียก service update
        const response = await stockItemService.update(item_id, data, files, reqUsername);

        // ส่งผลลัพธ์กลับ client
        return ResponseUtils.handleCustomResponse(res, response, HttpStatus.OK);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorUpdate(res, operation, error.message, 'item.items', true, reqUsername);
    }
};

export const del = async (req: Request, res: Response) => {
    const operation = 'StockItemController.delete';

    // ดึง username ของผู้ทำการลบ
    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    const item_id_str = req.params.item_id;
    const item_id = Number(item_id_str);
    if (isNaN(item_id)) {
        return ResponseUtils.handleBadRequest(res, lang.msgInvalidParameter());
    }

    try {
        // เรียก service delete
        const response = await stockItemService.delete(item_id, reqUsername);

        // ส่งผลลัพธ์กลับ client
        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorDelete(res, operation, error.message, 'item.items', true, reqUsername);
    }
};

export const delAll = async (req: Request, res: Response) => {
    const operation = 'StockItemController.deleteAll';

    // ดึง username ของผู้ทำการลบ
    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(
            res,
            lang.msgRequiredUsername()
        );
    }

    try {
        // เรียก service delete all
        const response = await stockItemService.deleteAll(reqUsername);

        // ส่งผลลัพธ์กลับ client
        return ResponseUtils.handleResponse(res, response);

    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorDelete(
            res,
            operation,
            error.message,
            'item.items',
            true,
            reqUsername
        );
    }
};

export const getAll = async (req: Request, res: Response) => {
    const operation = 'StockItemController.getAll';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    try {
        const response = await stockItemService.getAll();
        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorGet(res, operation, error.message, 'item.items', true, reqUsername);
    }
};

export const getById = async (req: Request, res: Response) => {
    const operation = 'StockItemController.getById';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    const item_id_str = req.params.item_id;
    if (!item_id_str) {
        return ResponseUtils.handleBadRequest(res, lang.msgInvalidParameter());
    }

    // แปลง string เป็น number
    const item_id = Number(item_id_str);
    if (isNaN(item_id)) {
        return ResponseUtils.handleBadRequest(res, lang.msgInvalidParameter());
    }

    try {
        const response = await stockItemService.getById(item_id); // ✅ now it's a number
        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorGet(res, operation, error.message, 'item.items', true, reqUsername);
    }
};
