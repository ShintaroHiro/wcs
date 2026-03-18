import { Router } from 'express';
import { authenticateToken } from '../common/auth.token';
import * as orderAgmbController from '../controllers/agmb.controller';
const router = Router();

/**
 * @swagger
 * tags:
 *   name: Agmb
 *   description: การจัดการ Order AGMB Store
 */

/**
 * @swagger
 * /api/agmb/get-all-order-by-user:
 *   get:
 *     summary: ดึงข้อมูล order ของ user ที่ login เท่านั้น เฉพาะกรณี requester เท่านั้น
 *     tags: [Agmb]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     responses:
 *       200:
 *         description: พบข้อมูล order ของ user
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 *       404:
 *         description: ไม่พบ order ของ user
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get('/get-all-order-by-user',
    authenticateToken,
    orderAgmbController.getOrderAllByUser
);

export default router;