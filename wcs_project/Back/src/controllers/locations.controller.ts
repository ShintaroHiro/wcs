import { Request, Response } from 'express';
import dotenv from 'dotenv';
import ResponseUtils, { HttpStatus } from '../utils/ResponseUtils';
import RequestUtils from '../utils/RequestUtils'; // Import the utility class
import * as lang from '../utils/LangHelper';
import { LocationMasterService } from '../services/locations.service';
import { Locations } from '../entities/m_location.entity';
import { DataSanitizer } from '../utils/DataSanitizer';

dotenv.config();

const locationMasterService = new LocationMasterService();

export const create = async (req: Request, res: Response) => {
    const operation = 'LocationMasterController.create';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    try {  

        // Sanitization ข้อมูลจาก req.body
        const data: Partial<Locations> = DataSanitizer.fromObject<Locations>(req.body, Locations);

        const response = await locationMasterService.create(data, reqUsername);

        return ResponseUtils.handleCustomResponse(res, response, HttpStatus.CREATED);

    } catch (error: any) {
        // Log ข้อผิดพลาด
        console.error(`Error during ${operation}:`, error);

        // จัดการข้อผิดพลาดและส่ง response
        return ResponseUtils.handleErrorCreate(res, operation, error.message, 'item.locations', true, reqUsername);
    }
};

export const update = async (req: Request, res: Response) => {
    const operation = 'LocationMasterController.update';

    // ดึง username ของผู้ทำการอัปเดตจาก token
    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    // รับ loc_id จากพารามิเตอร์
    const item_id_str = req.params.loc_id;
    const loc_id = Number(item_id_str);
    if (isNaN(loc_id)) {
        return ResponseUtils.handleBadRequest(res, lang.msgInvalidParameter());
    }


    try {
        // ทำ sanitize ข้อมูลจาก body
        const data: Partial<Locations> = DataSanitizer.fromObject<Locations>(req.body, Locations);

        // เรียก service update
        const response = await locationMasterService.update(loc_id, data, reqUsername);

        // ส่งผลลัพธ์กลับ client
        return ResponseUtils.handleCustomResponse(res, response, HttpStatus.OK);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorUpdate(res, operation, error.message, 'item.locations', true, reqUsername);
    }
};

export const del = async (req: Request, res: Response) => {
    const operation = 'LocationMasterController.delete';

    const item_id_str = req.params.loc_id;
    const loc_id = Number(item_id_str);
    if (isNaN(loc_id)) {
        return ResponseUtils.handleBadRequest(res, lang.msgInvalidParameter());
    }

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    try {
        // เรียก service delete
        const response = await locationMasterService.delete(loc_id);

        // ส่งผลลัพธ์กลับ client
        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorDelete(res, operation, error.message, 'item.locations', true, reqUsername);
    }
};

export const delAll = async (req: Request, res: Response) => {
    const operation = 'LocationMasterController.deleteAll';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    try {
        // เรียก service delete all
        const response = await locationMasterService.deleteAll();

        // ส่งผลลัพธ์กลับ client
        return ResponseUtils.handleResponse(res, response);

    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorDelete(
            res,
            operation,
            error.message,
            'item.locations',
            true,
            reqUsername
        );
    }
};

export const getAll = async (req: Request, res: Response) => {
    const operation = 'LocationMasterController.getAll';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

    try {
        const response = await locationMasterService.getAll();
        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);
        return ResponseUtils.handleErrorGet(res, operation, error.message, 'item.locations', true, reqUsername);
    }
};

export const getById = async (req: Request, res: Response) => {
    const operation = 'LocationMasterController.getById';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(
            res,
            lang.msgRequiredUsername()
        );
    }

    const loc_id = Number(req.params.loc_id);

    if (isNaN(loc_id) || loc_id <= 0) {
        return ResponseUtils.handleBadRequestIsRequired(
            res,
            lang.msgInvalidParameter()
        );
    }

    try {
        const response = await locationMasterService.getById(loc_id);
        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        console.error(`Error during ${operation}:`, error);

        return ResponseUtils.handleErrorGet(
            res,
            operation,
            error.message,
            'item.locations',
            true,
            reqUsername
        );
    }
};

export const searchLocations = async (req: Request, res: Response) => {
    const operation = 'LocationMasterController.searchLocations';

    const reqUsername = RequestUtils.getUsernameToken(req, res);
    if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }
    const { loc, box_loc } = req.query;

    try {
        const response = await locationMasterService.searchLocations(
            loc as string,
            box_loc as string,
        );
        return ResponseUtils.handleResponse(res, response);
    } catch (error: any) {
        return ResponseUtils.handleErrorSearch(res, operation, error.message, 'item.location', true, reqUsername);
    }
};