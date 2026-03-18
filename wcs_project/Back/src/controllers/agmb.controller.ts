import { Request, Response } from 'express';
import dotenv from 'dotenv';
import ResponseUtils, { HttpStatus } from '../utils/ResponseUtils';
import RequestUtils from '../utils/RequestUtils';
import { OrderAgmbService } from '../services/order_agmb.service';
import * as lang from '../utils/LangHelper'; // ใช้ helper function

dotenv.config();

const orderAgmbService = new OrderAgmbService();

export const getOrderAllByUser = async (req: Request, res: Response) => {
    const operation = 'OrderAgmbController.getOrderAllByUser';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    const reqUserId = RequestUtils.getUserIdToken(req, res);
    if (!reqUserId) return;

    const reqRole = RequestUtils.getRoleToken(req, res);
    if (!reqRole) return;

    const reqStoreType = RequestUtils.getStoreTypeToken(req, res);
    if (!reqStoreType) return;

    try {
        let userId: number | undefined = undefined;

        // ✅ ถ้าเป็น REQUESTER → filter ตาม user_id
        if (reqRole === 'REQUESTER') {
            userId = reqUserId;
        }

        //  // ✅ REQUESTER และ STORE → filter ตาม user_id
        // if (reqRole === 'REQUESTER' || reqRole === 'STORE') {
        //     userId = reqUserId;
        // }

        // role อื่น → userId = undefined (ดึงทั้งหมด)
        const response = await orderAgmbService.getOrderAllByUser(userId, reqStoreType);
        return ResponseUtils.handleResponse(res, response);

    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorGet(
            res,
            operation,
            error.message,
            'item.counter',
            true,
            reqUsername
        );
    }
};
