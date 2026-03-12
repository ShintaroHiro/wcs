import { Request, Response } from 'express';
import ResponseUtils from './ResponseUtils'; // Adjust the import path as necessary

class RequestUtils {
  static getUsernameToken(req: Request, res: Response): string | null {
    const reqUsername = req.user?.username;
    if (!reqUsername) {
      ResponseUtils.handleBadRequestIsRequired(res, 'field.username');
      return null;
    }
    console.log('req username:', reqUsername);
    return reqUsername;
  }

  static getRoleToken(req: Request, res: Response): string | null {
    const reqRole = req.user?.role_code;
    if (!reqRole) {
      ResponseUtils.handleBadRequestIsRequired(res, 'item.role');
      return null;
    }
    console.log('req role:', reqRole);
    return reqRole;
  }

  static getUserIdToken(req: Request, res: Response): number | null {
    const reqUserId = req.user?.user_id;
    if (!reqUserId) {
      ResponseUtils.handleBadRequestIsRequired(res, 'field.user_id');
      return null;
    }
    console.log('req user_id:', reqUserId);
    return reqUserId;
  }

  static getStoreTypeToken(req: Request, res: Response): string | null {
    const reqStoreType = req.user?.store_type;

    if (!reqStoreType) {
      ResponseUtils.handleBadRequestIsRequired(res, 'field.store_type');
      return null;
    }

    console.log('req store_type:', reqStoreType);
    return reqStoreType;
  }
}

export default RequestUtils;