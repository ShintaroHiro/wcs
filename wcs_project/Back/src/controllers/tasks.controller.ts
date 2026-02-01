// controllers/tasks.controller.ts
import { Request, Response } from 'express';
import ResponseUtils, { HttpStatus } from '../utils/ResponseUtils';
import RequestUtils from '../utils/RequestUtils';
import * as lang from '../utils/LangHelper';
import { CreateTaskBatchDto, OrchestratedTaskService } from '../services/tasks.service';

export function buildTasksController(orchestrator: OrchestratedTaskService) {

const create = async (req: Request, res: Response) => {
    const operation = 'TasksController.create';

    const reqUserId = RequestUtils.getUserIdToken(req, res);
    const reqUsername = RequestUtils.getUsernameToken(req, res);

    if (!reqUserId || !reqUsername) {
    return ResponseUtils.handleBadRequest(res, 'User required');
    }


    try {
        const body = req.body as CreateTaskBatchDto;

        // 1️⃣ validate body
        if (!Array.isArray(body.items) || body.items.length === 0) {
        return ResponseUtils.handleBadRequest(
            res,
            'items array is required'
        );
        }

        // 2️⃣ แปลง items → orderIds
        const orderIds = body.items
        .map(i => Number(i.order_id))
        .filter((id): id is number => !isNaN(id));

        if (orderIds.length === 0) {
            return ResponseUtils.handleBadRequest(
                res,
                'order_id must be number'
            );
        }

        // 3️⃣ เรียก service (ใหม่)
        const response = await orchestrator.createAndOpenBatch(
        orderIds,
        reqUserId
        );

        const status = response.isCompleted
        ? HttpStatus.CREATED
        : HttpStatus.BAD_REQUEST;

        return ResponseUtils.handleCustomResponse(res, response, status);

    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);

        return ResponseUtils.handleErrorCreate(
        res,
        operation,
        error.message,
        'item.execution',
        true,
        reqUsername
        );
    }
};

    const changeToWaitingBatch = async (req: Request, res: Response) => {
        const operation = 'TasksController.changeToWaitingBatch';

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
            // เรียก service changeToWaitingBatch
            const response = await orchestrator.changeToWaitingBatch(dto, reqUsername);

            // ส่งผลลัพธ์กลับ client
            return ResponseUtils.handleResponse(res, response);

        } catch (error: any) {
            console.error(`Error during ${operation}:`, error);

            return ResponseUtils.handleErrorDelete(
                res,
                operation,
                error.message,
                'change To Waiting',
                true,
                reqUsername
            );
        }
    };

    const changeToPendingBatch = async (req: Request, res: Response) => {
        const operation = 'TasksController.changeToPendingBatch';

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
            // เรียก service changeToPendingBatch
            const response = await orchestrator.changeToPendingBatch(dto, reqUsername);

            // ส่งผลลัพธ์กลับ client
            return ResponseUtils.handleResponse(res, response);

        } catch (error: any) {
            console.error(`Error during ${operation}:`, error);

            return ResponseUtils.handleErrorDelete(
                res,
                operation,
                error.message,
                'change To Waiting',
                true,
                reqUsername
            );
        }
    };

    const handleOrderItemMrs = async (req: Request, res: Response) => {
        const operation = 'TasksController.handleOrderItemMrs';

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
            const response = await orchestrator.handleOrderItemMrs(order_id, actual_qty, reqUsername);
            return ResponseUtils.handleResponse(res, response);
        } catch (error: any) {
            console.error(`Error during ${operation}:`, error);
            return ResponseUtils.handleErrorDelete(
                res,
                operation,
                error.message,
                'handle order items',
                true,
                reqUsername
            );
        }
    };

    const handleOrderItemWRS = async (req: Request, res: Response) => {
        const operation = 'TasksController.handleOrderItemWRS';

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
            const response = await orchestrator.handleOrderItemWRS(order_id, actual_qty, reqUsername);
            return ResponseUtils.handleResponse(res, response);
        } catch (error: any) {
            console.error(`Error during ${operation}:`, error);
            return ResponseUtils.handleErrorDelete(
                res,
                operation,
                error.message,
                'handle order items',
                true,
                reqUsername
            );
        }
    };

    const getAll = async (req: Request, res: Response) => {
        const operation = 'TasksController.getAll';

        const reqUsername = RequestUtils.getUsernameToken(req, res);
        if (!reqUsername) {
            return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
        }


        try {
            const response = await orchestrator.getAll();
            return ResponseUtils.handleResponse(res, response);
        } catch (error: any) {
            console.error(`Error during ${operation}:`, error);
            return ResponseUtils.handleErrorGet(res, operation, error.message, 'item.execution', true, reqUsername);
        }
    };

    return { create, changeToWaitingBatch , changeToPendingBatch , handleOrderItemMrs , handleOrderItemWRS, getAll};
}
