import { Router } from 'express';
import { authenticateToken , authenticateWCS} from '../common/auth.token';
import * as counterController from '../controllers/counter.controller'
const router = Router();

/**
 * @swagger
 * tags:
 *   name: Counter
 *   description: การจัดการ counter
 */

/**
 * @swagger
 * /api/counter/get-all-order-by-user:
 *   get:
 *     summary: ดึงข้อมูล counter + order ของ user ที่ login เท่านั้น
 *     tags: [Counter]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     responses:
 *       200:
 *         description: พบข้อมูล counter ของ user
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 *       404:
 *         description: ไม่พบ counter ของ user
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get('/get-all-order-by-user',
    authenticateToken,
    counterController.getOrderAllByUser
);

/**
 * @swagger
 * /api/counter/get-all-by-user:
 *   get:
 *     summary: ดึงข้อมูล counter ของ user ที่ login เท่านั้น
 *     tags: [Counter]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     responses:
 *       200:
 *         description: พบข้อมูล counter ของ user
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 *       404:
 *         description: ไม่พบ counter ของ user
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get('/get-all-by-user',
    authenticateToken,
    counterController.getCounterAllByUser
);


/**
 * @swagger
 * /api/counter/get-by-id/{counterId}:
 *   get:
 *     summary: ดึงข้อมูลรายการ counter
 *     tags: [Counter]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: path
 *         name: counterId
 *         schema:
 *           type: number
 *         required: true
 *         description: ไอดีรายการ counter
 *     responses:
 *       200:
 *         description: พบข้อมูลรายการ counter
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลรายการที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get('/get-by-id/:counterId'
    , authenticateToken
    , counterController.getByCounterId);

    /**
 * @swagger
 * /api/counter/get-by-id-public/{counterId}:
 *   get:
 *     summary: ดึงข้อมูลรายการ counter
 *     tags: [Counter]
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: path
 *         name: counterId
 *         schema:
 *           type: number
 *         required: true
 *         description: ไอดีรายการ counter
 *     responses:
 *       200:
 *         description: พบข้อมูลรายการ counter
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลรายการที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get('/get-by-id-public/:counterId'
    , authenticateWCS
    , counterController.getByCounterIdPublic);

    /**
 * @swagger
 * /api/counter/change-status:
 *   put:
 *     summary: เปลี่ยนสถานะ counter ตาม order_id
 *     tags: [Counter]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *               - status
 *             properties:
 *               order_id:
 *                 type: integer
 *                 example: 1001
 *               status:
 *                 type: string
 *                 enum: [EMPTY, WAITING_AMR, READY_TO_PICK, ERROR, WAITING_PICK]
 *                 example: WAITING_PICK
 *     responses:
 *       200:
 *         description: เปลี่ยนสถานะ counter สำเร็จ
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 *       404:
 *         description: ไม่พบ counter ตาม order_id
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.put(
    '/change-status',
    authenticateToken,
    counterController.counterChangeStatus
);

export default router;