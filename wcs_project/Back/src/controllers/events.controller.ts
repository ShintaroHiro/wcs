import { Request, Response } from 'express';
import dotenv from 'dotenv';
import ResponseUtils, { HttpStatus } from '../utils/ResponseUtils';
import * as lang from '../utils/LangHelper'; // ใช้ helper function
import RequestUtils from '../utils/RequestUtils'; // Import the utility class

import { EventsService } from '../services/events.service';

dotenv.config();

const eventsService = new EventsService();

export const setOrderError = async (req: Request, res: Response) => {
    const operation = 'EventsController.setOrderError';

    // 🔹 ดึง username จาก token
    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(
            res,
            lang.msgRequiredUsername()
        );
    }

    // 🔹 รับ order_id จาก path
    const order_id_str = req.params.order_id;
    const order_id = Number(order_id_str);

    if (isNaN(order_id)) {
        return ResponseUtils.handleBadRequest(
            res,
            lang.msgInvalidParameter()
        );
    }

    try {

        const response = await eventsService.setOrderError(
            order_id,
            reqUsername
        );

        return ResponseUtils.handleCustomResponse(
            res,
            response,
            HttpStatus.OK
        );

    } catch (error: any) {

        console.error(`Error during ${operation}:`, error);

        return ResponseUtils.handleErrorUpdate(
            res,
            operation,
            error.message,
            'execution.setOrderError',
            true,
            reqUsername
        );
    }
};

export const getAll = async (req: Request, res: Response) => {
    const operation = 'EventsController.getAll';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    try {
        const response = await eventsService.getAll();
        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorGet(res, operation, error.message, 'item.events', true, reqUsername);
    }
};

export const getByRelatedId = async (req: Request, res: Response) => {
    const operation = 'EventsController.getByRelatedId';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(
            res,
            lang.msgRequiredUsername()
        );
    }

    // ✅ ดึง param และ trim
    const related_id_str = req.params.related_id?.trim();

    if (!related_id_str) {
        return ResponseUtils.handleBadRequest(
            res,
            lang.msgInvalidParameter()
        );
    }

    // ✅ ต้องเป็นตัวเลขเท่านั้น
    if (!/^\d+$/.test(related_id_str)) {
        return ResponseUtils.handleBadRequest(
            res,
            lang.msgInvalidParameter()
        );
    }

    const related_id = Number(related_id_str);

    // ✅ กัน 0 หรือค่าติดลบ
    if (related_id <= 0) {
        return ResponseUtils.handleBadRequest(
            res,
            lang.msgInvalidParameter()
        );
    }

    try {

        const response = await eventsService.getByRelatedId(related_id);

        return ResponseUtils.handleResponse(res, response);

    } catch (error: any) {

        console.error(`Error during ${operation}:`, error);

        return ResponseUtils.handleErrorGet(
            res,
            operation,
            error.message,
            'item.events',
            true,
            reqUsername
        );
    }
};