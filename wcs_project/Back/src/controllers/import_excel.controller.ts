import { Request, Response } from 'express';
import dotenv from 'dotenv';
import ResponseUtils from '../utils/ResponseUtils';
import * as lang from '../utils/LangHelper';
import RequestUtils from '../utils/RequestUtils';

import { ImportService } from '../services/import_execel.service';

const importService = new ImportService();

export const createUsageJson = async (req: Request, res: Response) => {
    const operation = 'ImportController.createUsageJson';

    // ✅ ใช้ username เหมือน controller อื่น
    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    try {
        if (!req.body || (Array.isArray(req.body) && req.body.length === 0)) {
        return ResponseUtils.handleBadRequest(res, 'No data provided');
        }

        const requestData = Array.isArray(req.body) ? req.body : [req.body];

        const response = await importService.createUsageJson(requestData, reqUsername);

        return ResponseUtils.handleResponse(res, response);

    } catch (error: any) {
        console.error(`❌ Error during ${operation}:`, error);
        return ResponseUtils.handleError(
        res,
        operation,
        error.message,
        'importing excel',
        true,
        reqUsername
        );
    }
};

export const createReceiptJson = async (req: Request, res: Response) => {
    const operation = 'ImportController.createReceiptJson';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    try {
        if (!req.body) {
            return ResponseUtils.handleBadRequest(res, 'No data provided');
        }

        let requestData: any[] = [];
        let mode: 'CHECK' | 'OVERWRITE' | 'SKIP' = 'CHECK'; // ✅ type ชัด

        // 🔥 รองรับ backward + new format
        if (Array.isArray(req.body)) {
            requestData = req.body;
        } else {
            requestData = Array.isArray(req.body.data) ? req.body.data : [];

            // ✅ validate mode
            const incomingMode = (req.body.mode || 'CHECK').toUpperCase();

            if (['CHECK', 'OVERWRITE', 'SKIP'].includes(incomingMode)) {
                mode = incomingMode as 'CHECK' | 'OVERWRITE' | 'SKIP';
            } else {
                return ResponseUtils.handleBadRequest(res, `Invalid mode: ${req.body.mode}`);
            }
        }

        if (!requestData.length) {
            return ResponseUtils.handleBadRequest(res, 'No data provided');
        }

        const response = await importService.createReceiptJson(
            requestData,
            reqUsername,
            undefined,
            { mode } // ✅ ส่ง mode เข้า service
        );

        return ResponseUtils.handleResponse(res, response);

    } catch (error: any) {
        console.error(`❌ Error during ${operation}:`, error);

        return ResponseUtils.handleError(
            res,
            operation,
            error.message,
            'importing excel',
            true,
            reqUsername
        );
    }
};

export const createReturnJson = async (req: Request, res: Response) => {
    const operation = 'ImportController.createReturnJson';

    // ✅ ใช้ username เหมือน controller อื่น
    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    try {
        if (!req.body || (Array.isArray(req.body) && req.body.length === 0)) {
        return ResponseUtils.handleBadRequest(res, 'No data provided');
        }

        const requestData = Array.isArray(req.body) ? req.body : [req.body];

        const response = await importService.createReturnJson(requestData, reqUsername);

        return ResponseUtils.handleResponse(res, response);

    } catch (error: any) {
        console.error(`❌ Error during ${operation}:`, error);
        return ResponseUtils.handleError(
        res,
        operation,
        error.message,
        'importing excel',
        true,
        reqUsername
        );
    }
};

export const createItemJson = async (req: Request, res: Response) => {
    const operation = 'ImportController.createItemJson';

    // ✅ ใช้ username เหมือน controller อื่น
    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    try {
        if (!req.body || (Array.isArray(req.body) && req.body.length === 0)) {
        return ResponseUtils.handleBadRequest(res, 'No data provided');
        }

        const requestData = Array.isArray(req.body) ? req.body : [req.body];

        const response = await importService.createItemJson(requestData, reqUsername);

        return ResponseUtils.handleResponse(res, response);

    } catch (error: any) {
        console.error(`❌ Error during ${operation}:`, error);
        return ResponseUtils.handleError(
        res,
        operation,
        error.message,
        'importing excel',
        true,
        reqUsername
        );
    }
};