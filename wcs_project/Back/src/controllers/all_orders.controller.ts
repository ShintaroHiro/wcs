import { Request, Response } from 'express';
import dotenv from 'dotenv';
import ResponseUtils from '../utils/ResponseUtils';
import RequestUtils from '../utils/RequestUtils';
import { AllOrdersService } from '../services/all_orders.service';
import { TypeInfm } from '../common/global.enum';
import * as lang from '../utils/LangHelper';

dotenv.config();

const allOrdersService = new AllOrdersService();

export const getUsageAll = async (req: Request, res: Response) => {
    const operation = 'OrderController.getUsageAll';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }


    try {
        // 🔹 รับค่าจาก query
        const {
            isExecution,
            store_type,
            mc_code,
        } = req.query;

        const response = await allOrdersService.getUsageAll({
            // ✅ แปลง string → boolean
            isExecution: isExecution === 'true',
            store_type: store_type as string | undefined,
            mc_code: mc_code as string | undefined,
        });

        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorGet(
            res,
            operation,
            error.message,
            'item.order',
            true,
            reqUsername
        );
    }
};

export const getReceiptAll = async (req: Request, res: Response) => {
    const operation = 'OrderController.getReceiptAll';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }


    try {
        // 🔹 รับค่าจาก query
        const {
            isExecution,
            store_type,
            mc_code,
        } = req.query;

        const response = await allOrdersService.getReceiptAll({
            // ✅ แปลง string → boolean
            isExecution: isExecution === 'true',
            store_type: store_type as string | undefined,
            mc_code: mc_code as string | undefined,
        });

        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorGet(
            res,
            operation,
            error.message,
            'item.order',
            true,
            reqUsername
        );
    }
};

export const getReturnAll = async (req: Request, res: Response) => {
    const operation = 'OrderController.getReturnAll';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }


    try {
        // 🔹 รับค่าจาก query
        const {
            isExecution,
            store_type,
            mc_code,
        } = req.query;

        const response = await allOrdersService.getReturnAll({
            // ✅ แปลง string → boolean
            isExecution: isExecution === 'true',
            store_type: store_type as string | undefined,
            mc_code: mc_code as string | undefined,
        });

        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorGet(
            res,
            operation,
            error.message,
            'item.order',
            true,
            reqUsername
        );
    }
};

export const getTransferAll = async (req: Request, res: Response) => {
    const operation = 'OrderController.getTransferAll';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }


    try {
        // 🔹 รับค่าจาก query
        const {
            isExecution,
            store_type,
            mc_code,
        } = req.query;

        const response = await allOrdersService.getTransferAll({
            // ✅ แปลง string → boolean
            isExecution: isExecution === 'true',
            store_type: store_type as string | undefined,
            mc_code: mc_code as string | undefined,
        });

        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorGet(
            res,
            operation,
            error.message,
            'item.order',
            true,
            reqUsername
        );
    }
};

export const getStatusAll = async (req: Request, res: Response) => {
    const operation = 'OrderController.getStatusAll';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }


    try {
        // 🔹 รับค่าจาก query
        const {
            isExecution,
            store_type,
            mc_code,
            type,
        } = req.query;

        let orderType: TypeInfm | undefined;
        if (typeof type === 'string') {
            if (Object.values(TypeInfm).includes(type as TypeInfm)) {
                orderType = type as TypeInfm;
            } else {
                return res.status(400).json({
                    message: `Invalid order type: ${type}`,
                });
            }
        }
        
        const response = await allOrdersService.getStatusAll({
            // ✅ แปลง string → boolean
            isExecution: isExecution === 'true',
            store_type: store_type as string | undefined,
            mc_code: mc_code as string | undefined,
            type: orderType,
        });

        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorGet(
            res,
            operation,
            error.message,
            'item.order',
            true,
            reqUsername
        );
    }
};