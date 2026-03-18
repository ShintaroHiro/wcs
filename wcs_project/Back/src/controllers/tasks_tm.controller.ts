import { Request, Response } from 'express';
import dotenv from 'dotenv';
import ResponseUtils, { HttpStatus } from '../utils/ResponseUtils';
import * as lang from '../utils/LangHelper'; // ใช้ helper function
import { DataSanitizer } from '../utils/DataSanitizer'; // นำเข้า DataSanitizer
import RequestUtils from '../utils/RequestUtils'; // Import the utility class

import { TMStoreService } from '../services/tasks_tm.service';

dotenv.config();

const tmStoreService = new TMStoreService();

export const changeToProcessingBatch = async (req: Request, res: Response) => {
    const operation = 'TasksTMController.changeToProcessingBatch';

    // ดึง username ของผู้เปลี่ยน status
    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    // ตรวจสอบ body
    const dto = req.body;

    if (!dto || !Array.isArray(dto.items) || dto.items.length === 0) {
        return ResponseUtils.handleBadRequest(
            res,
            "Invalid request: items[] is required"
        );
    }

    try {

        // เรียก service changeToProcessingBatch
        const response = await tmStoreService.changeToProcessingBatch(
            dto,
            reqUsername
        );

        // ส่งผลลัพธ์กลับ client
        return ResponseUtils.handleResponse(res, response);

    } catch (error: any) {

        console.error(`Error during ${operation}:`, error);

        return ResponseUtils.handleErrorUpdate(
            res,
            operation,
            error.message,
            'change To Processing',
            true,
            reqUsername
        );

    }
};

export const handleOrderItemMRS = async (req: Request, res: Response) => {
    const operation = 'TasksTMController.handleOrderItemMRS';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    const order_id = Number(req.params.order_id);
    if (isNaN(order_id)) {
        return ResponseUtils.handleBadRequest(res, lang.msgInvalidParameter());
    }

    // แปลง actual_qty เป็น number
    const actual_qty = Number(req.params.actual_qty);
    if (isNaN(actual_qty) || actual_qty < 0) {
        return ResponseUtils.handleBadRequest(res, lang.msgInvalidParameter());
    }

    try {
        const response = await tmStoreService.handleOrderItemMRS(order_id, actual_qty, reqUsername);
        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorCreate(
            res,
            operation,
            error.message,
            'handle order items',
            true,
            reqUsername
        );
    }
};

export const handleErrorOrderItemMRS = async (req: Request, res: Response) => {

    const operation = 'TasksTMController.handleErrorOrderItemMRS';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    const { event_id, items } = req.body;

    if (!event_id || isNaN(Number(event_id))) {
        return ResponseUtils.handleBadRequest(res, "Invalid event_id");
    }

    if (!Array.isArray(items) || items.length === 0) {
        return ResponseUtils.handleBadRequest(res, "Items must be a non-empty array");
    }

    for (const item of items) {
        if (
            !item.order_id ||
            isNaN(Number(item.order_id)) ||
            isNaN(Number(item.actual_qty)) ||
            item.actual_qty < 0
        ) {
            return ResponseUtils.handleBadRequest(res, "Invalid order data");
        }
    }

    try {

        const response = await tmStoreService.handleErrorOrderItemMRS(
            Number(event_id),
            items,
            reqUsername
        );

        return ResponseUtils.handleResponse(res, response);

    } catch (error: any) {

        console.error(`Error during ${operation}:`, error);

        return ResponseUtils.handleErrorCreate(
            res,
            operation,
            error.message,
            'handle error order items',
            true,
            reqUsername
        );
    }
};

export const handleManualOrder = async (req: Request, res: Response) => {
    const operation = 'TasksTMController.handleManualOrder';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    // 🔹 รับ body เป็น array [{ order_id, actual_qty }]
    const items: { order_id: number; actual_qty: number }[] = req.body;
    if (!Array.isArray(items) || !items.length) {
        return ResponseUtils.handleBadRequest(res, lang.msgInvalidParameter());
    }

    // 🔹 Validate แต่ละ item
    for (const item of items) {
        if (
            typeof item.order_id !== "number" ||
            isNaN(item.order_id) ||
            typeof item.actual_qty !== "number" ||
            isNaN(item.actual_qty) ||
            item.actual_qty < 0
        ) {
            return ResponseUtils.handleBadRequest(res, lang.msgInvalidParameter());
        }
    }

    try {
        const response = await tmStoreService.handleManualOrder(items, reqUsername);
        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorCreate(
            res,
            operation,
            error.message,
            'handle manual order items',
            true,
            reqUsername
        );
    }
};

export const handleErrorOrderItemAgmb = async (req: Request, res: Response) => {

    const operation = 'TasksTMController.handleErrorOrderItemAgmb';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    const { event_id, items } = req.body;

    if (!event_id || isNaN(Number(event_id))) {
        return ResponseUtils.handleBadRequest(res, "Invalid event_id");
    }

    if (!Array.isArray(items) || items.length === 0) {
        return ResponseUtils.handleBadRequest(res, "Items must be a non-empty array");
    }

    for (const item of items) {
        if (
            !item.order_id ||
            isNaN(Number(item.order_id)) ||
            isNaN(Number(item.actual_qty)) ||
            item.actual_qty < 0
        ) {
            return ResponseUtils.handleBadRequest(res, "Invalid order data");
        }
    }

    try {

        const response = await tmStoreService.handleErrorOrderItemAgmb(
            Number(event_id),
            items,
            reqUsername
        );

        return ResponseUtils.handleResponse(res, response);

    } catch (error: any) {

        console.error(`Error during ${operation}:`, error);

        return ResponseUtils.handleErrorCreate(
            res,
            operation,
            error.message,
            'handle error order items',
            true,
            reqUsername
        );
    }
};