import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { ApiResponse } from '../models/api-response.model';
import config from '../config/GlobalConfig.json';  // ใช้ import แทน require
import ResponseUtils, { HttpStatus } from '../utils/ResponseUtils';
import * as lang from '../utils/LangHelper'; // ใช้ helper function
import { DataSanitizer } from '../utils/DataSanitizer'; // นำเข้า DataSanitizer
import { s_user } from '../entities/s_user.entity';
import RequestUtils from '../utils/RequestUtils'; // Import the utility class
import { EventService } from '../utils/EventService';

dotenv.config();

const userService = new UserService();
const JWT_SECRET = config.JwtConfig.Key;
const TOKEN_EXPIRE_MINUTES  = parseInt(config.JwtConfig.ExpireMinutes);

const eventService = new EventService();

// export const login = async (req: Request, res: Response) => {
//   const operation = 'UserController.login';
//   const { username, password } = req.body;
//   try {
//     const response = await userService.validate(username, password);
//     if (response.isCompleted) {
//       const token = jwt.sign({ user_id: response.data!.user_id, username: response.data!.username,role_code: response.data!.role_code }, JWT_SECRET, { expiresIn: `${TOKEN_EXPIRE_MINUTES}m` });
//       const token_expire = new Date(Date.now() + TOKEN_EXPIRE_MINUTES * 60 * 1000);
//       const loginResponse = {
//         user_id: response.data!.user_id,
//         username: response.data!.username,
//         role_code: response.data!.role_code,
//         token,
//         token_expire
//       };
//       const apiResponse = response.setComplete(lang.msgSuccessfulFormat('item.login'), loginResponse, operation, username); 
//       return ResponseUtils.handleResponse(res,apiResponse, true, operation, username);
//     } else {
//       return ResponseUtils.handleCustomResponse(res, response, HttpStatus.UNAUTHORIZED, true, operation, username);
//     }
    
//   } catch (error: any) {
//     return ResponseUtils.handleError(res, 'UserController.login', error.message, 'item.login', true, username);
//   }
// };

export const login = async (req: Request, res: Response) => {
  const operation = 'UserController.login';
  const { username, password , store_type} = req.body;

  try {
    const response = await userService.validate(username, password);

    if (!response.isCompleted || !response.data) {

      // ✅ ใส่ตรงนี้
      await eventService.createEvent(null,{
        type: 'ERROR',
        category: 'SESSION',
        event_code: 'USER_LOGIN_FAILED',
        message: `Failed login attempt in ${store_type} Store`,
        level: 'WARNING',
        created_by: username,
      });

      return ResponseUtils.handleCustomResponse(
        res,
        response,
        HttpStatus.UNAUTHORIZED,
        true,
        operation,
        username
      );
    }

    const { user, mc_codes } = response.data;

    await eventService.createEvent(null,{
      type: 'EVENT',
      category: 'SESSION',
      event_code: 'USER_LOGIN_SUCCESS',
      message: `User ${user.username} logged in in ${store_type} Store`,
      related_id: user.user_id,
      level: 'INFO',
      created_by: user.username,
    });

    // ✅ สร้าง JWT (ยังคงใส่เฉพาะข้อมูลที่จำเป็น)
    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        role_code: user.role_code,
      },
      JWT_SECRET,
      { expiresIn: `${TOKEN_EXPIRE_MINUTES}m` }
    );

    const token_expire = new Date(
      Date.now() + TOKEN_EXPIRE_MINUTES * 60 * 1000
    );

    // ✅ response สำหรับ frontend
    const loginResponse = {
      user_id: user.user_id,
      username: user.username,
      role_code: user.role_code,
      mc_codes: mc_codes ?? [],   // ⭐ รองรับหลายค่า / ไม่มีค่า
      token,
      token_expire,
    };

    const apiResponse = response.setComplete(
      lang.msgSuccessfulFormat('item.login'),
      loginResponse,
      operation,
      username
    );

    return ResponseUtils.handleResponse(
      res,
      apiResponse,
      true,
      operation,
      username
    );

  } catch (error: any) {
    await eventService.createEvent(null,{
      type: 'ERROR',
      category: 'SYSTEM',
      event_code: 'LOGIN_EXCEPTION',
      message: error.message,
      level: 'ERROR',
      created_by: username,
    });

    console.error(`Error during ${operation}:`, error);
    return ResponseUtils.handleError(
      res,
      operation,
      error.message,
      'item.login',
      true,
      username
    );
  }
};


//ของเดิม
export const create = async (req: Request, res: Response) => {
  const operation = 'UserController.create';

  //console.log('Raw req.body:', req.body);

   // รับข้อมูล user ปกติ
  const data: Partial<s_user> & { mc_code?: string[] } =
    DataSanitizer.fromObject<s_user>(req.body, s_user) as any;

  // mc_code ไม่อยู่ใน entity → ต้องดึงเอง
  if (Array.isArray(req.body.mc_code)) {
    data.mc_code = req.body.mc_code;
  }

  //console.log('Parsed data:', data);

  // ตรวจสอบ username ส่งมาหรือไม่
  const reqUsername = RequestUtils.getUsernameToken(req, res);
  if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }
  
  try {

    data.create_by = reqUsername;
    const response = await userService.create(data);

    // ถ้าบันทึกไม่สำเร็จ ให้ retrun
    if (!response.isCompleted) {
      return ResponseUtils.handleResponse(res, response);
    }
    
    response.message = lang.msgSuccessAction('created', 'item.employee');
    return ResponseUtils.handleCustomResponse(res, response, HttpStatus.CREATED, true, reqUsername);
  } catch (error: any) {
    return ResponseUtils.handleErrorCreate(res, operation, error.message,'item.user', true, reqUsername);
  }
};

export const update = async (req: Request, res: Response) => {
  const operation = 'UserController.update';
  const { user_id } = req.params;
  //console.log('Raw req.body:', req.body);

  // รับข้อมูล user ปกติ
  const data: Partial<s_user> & { mc_code?: string[] } =
    DataSanitizer.fromObject<s_user>(req.body, s_user) as any;

  // mc_code ไม่อยู่ใน entity → ต้องดึงเอง
  if (Array.isArray(req.body.mc_code)) {
    data.mc_code = req.body.mc_code;
  }
  //console.log('Parsed data:', data);

  // ตรวจสอบ username ส่งมาหรือไม่
  const reqUsername = RequestUtils.getUsernameToken(req, res);
  if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

  //const data = req.body;
  try {

    data.update_by = reqUsername;
    const response = await userService.update(Number(user_id), data);
    return ResponseUtils.handleResponse(res, response);
    
  } catch (error: any) {
    return ResponseUtils.handleErrorUpdate(res, operation, error.message,'item.user', true, reqUsername);
  }
};

export const del = async (req: Request, res: Response) => {
  let response = new ApiResponse<void>();
  const operation = 'UserController.del';

  const { user_id } = req.params;
  // ตรวจสอบว่า user_id ถูกส่งมาหรือไม่
  if (!user_id) {
    return ResponseUtils.handleBadRequestIsRequired(res, 'field.user_id');
  }
  //console.log('Raw user_id:', user_id);

  // ตรวจสอบ username ส่งมาหรือไม่
  const reqUsername = RequestUtils.getUsernameToken(req, res);
  if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

  try {
  
    response = await userService.delete(Number(user_id));
    return ResponseUtils.handleResponse(res, response);

  } catch (error: any) {
    return ResponseUtils.handleErrorDelete(res, operation, error.message,'item.user', true, reqUsername);
  }
};

export const search = async (req: Request, res: Response) => {
  
  let response = new ApiResponse<s_user[]>();
  const operation = 'UserController.search';
  const { username, role_code } = req.query;

  // ตรวจสอบ username ส่งมาหรือไม่
  const reqUsername = req.user?.username; // ดึง username จาก headers
  if (!reqUsername) {
      return ResponseUtils.handleBadRequestIsRequired(res, 'field.username');
  }
  //console.log('req reqUsername:', reqUsername);
  
  try {
    response = await userService.search(username as string, role_code as string);
    return ResponseUtils.handleResponse(res, response);
  } catch (error: any) {
    return ResponseUtils.handleErrorSearch(res, operation, error.message,'item.user',true, reqUsername);
  }
};

export const getByUserId = async (req: Request, res: Response) => {
  let response = new ApiResponse<s_user | null>();
  const operation = 'UserController.getByUserId';
  const { user_id } = req.params;
  
  // ตรวจสอบ username ส่งมาหรือไม่
  const reqUsername = RequestUtils.getUsernameToken(req, res);
  if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

  try {
      response = await userService.getByUserId(Number(user_id));
      return ResponseUtils.handleResponse(res, response);
  } catch (error: any) {
    return ResponseUtils.handleErrorGet(res, operation, error.message, 'item.user', true, reqUsername);
  }
};

export const checkUsernameExists = async (req: Request, res: Response) => {
  const operation = 'UserController.checkUsernameExists';
  const { username } = req.query as { username: string };

 // ตรวจสอบ username ส่งมาหรือไม่
 const reqUsername = RequestUtils.getUsernameToken(req, res);
 if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

  try {
    const exists = await userService.checkUsernameExists(username);
    const response = new ApiResponse({
      message: exists ? lang.msgFound('field.username') : lang.msgNotFound('field.username'),
      data: { exists },
      isCompleted: true
    });
    return ResponseUtils.handleResponse(res, response);
  } catch (error: any) {
    return ResponseUtils.handleError(res, operation, error.message,'field.username',true, reqUsername);    
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const operation = 'UserController.changePassword';
  const { user_id } = req.params;
  const { oldPassword, newPassword } = req.body;

  // ตรวจสอบ username ส่งมาหรือไม่
  const reqUsername = RequestUtils.getUsernameToken(req, res);
  if (!reqUsername) {
        return ResponseUtils.handleBadRequest(res, lang.msgRequiredUsername());
    }

  try {

    const updateBy:any = reqUsername;
    const response = await userService.changePassword(Number(user_id), oldPassword, newPassword,updateBy);
    return ResponseUtils.handleResponse(res,response, true, operation, reqUsername);
  } catch (error: any) {
    return ResponseUtils.handleErrorUpdate(res, operation, error.message,'field.password', true, reqUsername);
  }
};

// Example controller function using the user info from the token
export const getUserToken = (req: Request, res: Response) => {
  if (req.user) {
    
    const response = new ApiResponse({
      message: lang.msgSuccessfulFormat('item.user'),
      data: req.user,
      isCompleted: true,
    });
    return res.status(200).json(response);
  } else {
    res.status(403).json({
      message: 'error getUserProfile',
      isCompleted: false,
    });
    return ResponseUtils.handleError(res, 'UserController.getUserProfile', 'error getUserProfile', 'item.user');
  }
};