import { Router } from 'express';
import { authenticateToken } from '../common/auth.token';
import * as inventoryController from '../controllers/inventory.controller'

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: การจัดการคลังสินค้า
 */

/**
 * @swagger
 * /api/inventory/get-all:
 *   get:
 *     summary: ดึงข้อมูลคลังสินค้า
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     responses:
 *       200:
 *         description: พบข้อมูลคลังสินค้า 
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลคลังสินค้า ที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get('/get-all'
    , authenticateToken
    , inventoryController.getAll);

/**
 * @swagger
 * /api/inventory/group-by-location:
 *   get:
 *     summary: ดึงข้อมูลคลังสินค้าตาม location
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     responses:
 *       200:
 *         description: พบข้อมูลคลังสินค้า 
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลคลังสินค้า ที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get('/group-by-location'
    , authenticateToken
    , inventoryController.getBoxAll);

export default router;