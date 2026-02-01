import { Request, Response } from 'express';
import dotenv from 'dotenv';
import ResponseUtils, { HttpStatus } from '../utils/ResponseUtils';
import * as lang from '../utils/LangHelper'; // ใช้ helper function
import { DataSanitizer } from '../utils/DataSanitizer'; // นำเข้า DataSanitizer
import RequestUtils from '../utils/RequestUtils'; // Import the utility class

import { OrdersService, UpdateOrderBatchInput } from '../services/orders.service';
import { Orders } from '../entities/orders.entity';

dotenv.config();

const ordersService = new OrdersService();

export const create = async (req: Request, res: Response) => {
    const operation = 'OrderController.create';
    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    try {
        const response = await ordersService.create(
        {
            type: req.body.type,
            items: req.body.items   // ✅ ใช้ของจริง ไม่แปลงมั่ว
        },
        reqUsername
        );

        return ResponseUtils.handleCustomResponse(res, response, HttpStatus.CREATED);

    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorCreate(
        res,
        operation,
        error.message,
        'item.order',
        true,
        reqUsername
        );
    }
};


export const updateOrder = async (req: Request, res: Response) => {
    const operation = 'OrderController.updateOrder';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    const orderId = Number(req.params.order_id);
    if (!orderId) {
        return ResponseUtils.handleBadRequest(res, lang.msgInvalidParameter());
    }

    try {
        // --- Orders หลัก (Partial) ---
        const orderData: Partial<Orders> =
            DataSanitizer.fromObject<Orders>(req.body, Orders);

        // --- sub-table ---
        const receiptData = req.body.receipt ?? null;
        const usageData = req.body.usage ?? null;
        const returnData = req.body.return ?? null;
        const transferData = req.body.transfer ?? null;

        // 🔑 แปลงให้ตรง UpdateOrderBatchInput
        const inputData: UpdateOrderBatchInput = {
            ...orderData, // 👈 field ระดับ batch (ถ้ามี)
            items: [
                {
                    order_id: orderId,

                    item_id: orderData.item_id,
                    mc_code: orderData.mc_code ?? undefined,
                    loc_id: orderData.loc_id,

                    receipt: receiptData,
                    usage: usageData,
                    return: returnData,
                    transfer: transferData,
                }
            ]
        };

        const response = await ordersService.update(
            inputData,
            reqUsername
        );

        return ResponseUtils.handleCustomResponse(
            res,
            response,
            HttpStatus.OK
        );

    } catch (error: any) {
        console.error(`❌ Error during ${operation}:`, error);
        return ResponseUtils.handleErrorUpdate(
            res,
            operation,
            error.message,
            'item.order',
            true,
            reqUsername
        );
    }
};

export const del = async (req: Request, res: Response) => {
    const operation = 'OrderController.delete';

    // ดึง username ของผู้ทำการลบ
    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(
            res,
            lang.msgRequiredUsername()
        );
    }

    // -----------------------------
    // รับ order_ids จาก body
    // -----------------------------
    const { order_ids } = req.body;

    if (!Array.isArray(order_ids) || order_ids.length === 0) {
        return ResponseUtils.handleBadRequest(
            res,
            lang.msgInvalidParameter()
        );
    }

    // แปลงเป็น number และ validate
    const orderIds: number[] = order_ids.map(Number);

    if (orderIds.some(id => isNaN(id))) {
        return ResponseUtils.handleBadRequest(
            res,
            lang.msgInvalidParameter()
        );
    }

    try {
        // เรียก service delete (หลายรายการ)
        const response = await ordersService.delete(
            orderIds,
            reqUsername
        );

        return ResponseUtils.handleResponse(res, response);

    } catch (error: any) {

        console.error(`Error during ${operation}:`, error);

        return ResponseUtils.handleErrorDelete(
            res,
            operation,
            error.message,
            'item.order',
            true,
            reqUsername
        );
    }
};

export const submitReturn = async (req: Request, res: Response) => {
    const operation = 'OrderController.submitReturn';

    /** ---------- ดึง username จาก token ---------- */
    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(
            res,
            lang.msgRequiredUsername()
        );
    }

    try {
        console.log('Raw req.body:', req.body);

        /** ---------- รับ order_ids จาก body ---------- */
        const { order_ids } = req.body;

        if (
            !Array.isArray(order_ids) ||
            order_ids.length === 0 ||
            order_ids.some(id => typeof id !== 'number')
        ) {
            return ResponseUtils.handleBadRequestIsRequired(
                res,
                'order_ids must be an array of number'
            );
        }

        /** ---------- เรียก service ---------- */
        const response = await ordersService.submitReturn(
            order_ids,
            reqUsername
        );

        return ResponseUtils.handleCustomResponse(
            res,
            response,
            HttpStatus.OK
        );

    } catch (error: any) {
        console.error(`❌ Error during ${operation}:`, error);
        return ResponseUtils.handleErrorUpdate(
            res,
            operation,
            error.message,
            'item.order',
            true,
            reqUsername
        );
    }
};

export const getAll = async (req: Request, res: Response) => {
    const operation = 'OrderController.getAll';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    try {
        const response = await ordersService.getAll();
        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorGet(res, operation, error.message, 'item.order', true, reqUsername);
    }
};

export const getUsageAll = async (req: Request, res: Response) => {
    const operation = 'OrderController.getUsageAll';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }
    
    try {
        const response = await ordersService.getUsageAll();
        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorGet(res, operation, error.message, 'item.order', true, reqUsername);
    }
};

export const getUsageById = async (req: Request, res: Response) => {
    const operation = 'OrderController.getUsageById';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    const order_id_str = req.params.order_id;
    if (!order_id_str) {
        return ResponseUtils.handleBadRequest(res, lang.msgInvalidParameter());
    }

    // แปลง string เป็น number
    const order_id = Number(order_id_str);
    if (isNaN(order_id)) {
        return ResponseUtils.handleBadRequest(res, lang.msgInvalidParameter());
    }

    try {
        const response = await ordersService.getUsageById(order_id); // ✅ now it's a number
        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorGet(res, operation, error.message, 'item.order', true, reqUsername);
    }
};

export const getReceiptAll = async (req: Request, res: Response) => {
    const operation = 'OrderController.getReceiptAll';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }
    
    try {
        const response = await ordersService.getReceiptAll();
        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorGet(res, operation, error.message, 'item.order', true, reqUsername);
    }
};

export const getReceiptById = async (req: Request, res: Response) => {
    const operation = 'OrderController.getReceiptById';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    const order_id_str = req.params.order_id;
    if (!order_id_str) {
        return ResponseUtils.handleBadRequest(res, lang.msgInvalidParameter());
    }

    // แปลง string เป็น number
    const order_id = Number(order_id_str);
    if (isNaN(order_id)) {
        return ResponseUtils.handleBadRequest(res, lang.msgInvalidParameter());
    }

    try {
        const response = await ordersService.getReceiptById(order_id); // ✅ now it's a number
        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorGet(res, operation, error.message, 'item.order', true, reqUsername);
    }
};

export const getMcCodeDropdown = async (req: Request, res: Response) => {
    const operation = 'OrderController.getMcCodeDropdown';

    // ดึง username จาก token
    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    try {

        // เรียก service getMcCodeDropdown เพื่อดึงข้อมูล
        const response = await ordersService.getMcCodeDropdown();

        // ส่ง response กลับ
        return ResponseUtils.handleResponse(res, response);

    } catch (error: any) {
        // Log ข้อผิดพลาด
        console.error(`Error during ${operation}:`, error);

        // จัดการข้อผิดพลาดและส่ง response
        return ResponseUtils.handleErrorGet(res, operation, error.message, 'item.order', true, reqUsername);
    }
};
