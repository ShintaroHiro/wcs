import { Request, Response } from 'express';
import dotenv from 'dotenv';
import ResponseUtils, { HttpStatus } from '../utils/ResponseUtils';
import RequestUtils from '../utils/RequestUtils';
import { BlockService } from '../services/block.service';
import * as lang from '../utils/LangHelper'; // ใช้ helper function

dotenv.config();

const blockService = new BlockService();

export const getOrderAllBlockByUser = async (req: Request, res: Response) => {
    const operation = 'blockController.getOrderAllBlockByUser';

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
        const response = await blockService.getOrderAllBlockByUser(userId, reqStoreType);
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

export const getBlockAll = async (req: Request, res: Response) => {
    const operation = 'blockController.getBlockAll';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    try {
        const response = await blockService.getBlockAll();
        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorGet(res, operation, error.message, 'item.aisle', true, reqUsername);
    }
};
