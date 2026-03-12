import { Router } from 'express';
import { authenticateToken } from '../common/auth.token';
import * as allOrderController from '../controllers/all_orders.controller';
import * as orderController from '../controllers/orders.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: การจัดการรายการ order ทั้งหมด
 */

/**
 * @swagger
 * /api/orders/get-usage-all:
 *   get:
 *     summary: ดึงข้อมูลรายการ order usage filter status / store_type / mc_code
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: query
 *         name: isExecution
 *         schema:
 *           type: boolean
 *         required: false
 *         description: |
 *           ถ้าเป็น true จะ filter status เฉพาะ WAITING | false จะ filter status ทุกสถานะ ยกเว้น WAITING และ FINISHED/COMPLETED | ไม่ใส่ = ทุกสถานะ
 *       - in: query
 *         name: store_type
 *         schema:
 *           type: string
 *         required: false
 *         description: filter ตาม store_type (ถ้าไม่ส่งจะดึงทั้งหมด)
 *       - in: query
 *         name: mc_code
 *         schema:
 *           type: string
 *         required: false
 *         description: filter ตาม mc_code (ถ้าไม่ส่งจะดึงทั้งหมด)
 *     responses:
 *       200:
 *         description: พบข้อมูลรายการ order usage
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลรายการ order usage ที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get(
    '/get-usage-all',
    authenticateToken,
    allOrderController.getUsageAll
);

/**
 * @swagger
 * /api/orders/get-receipt-all:
 *   get:
 *     summary: ดึงข้อมูลรายการ order receipt filter status / store_type / mc_code
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: query
 *         name: isExecution
 *         schema:
 *           type: boolean
 *         required: false
 *         description: |
 *           ถ้าเป็น true จะ filter status เฉพาะ WAITING | false จะ filter status ทุกสถานะ ยกเว้น WAITING และ FINISHED/COMPLETED | ไม่ใส่ = ทุกสถานะ
 *       - in: query
 *         name: store_type
 *         schema:
 *           type: string
 *         required: false
 *         description: filter ตาม store_type (ถ้าไม่ส่งจะดึงทั้งหมด)
 *       - in: query
 *         name: mc_code
 *         schema:
 *           type: string
 *         required: false
 *         description: filter ตาม mc_code (ถ้าไม่ส่งจะดึงทั้งหมด)
 *     responses:
 *       200:
 *         description: พบข้อมูลรายการ order receipt
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลรายการ order receipt ที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get(
    '/get-receipt-all',
    authenticateToken,
    allOrderController.getReceiptAll
);

/**
 * @swagger
 * /api/orders/get-return-all:
 *   get:
 *     summary: ดึงข้อมูลรายการ order return filter status / store_type / mc_code
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: query
 *         name: isExecution
 *         schema:
 *           type: boolean
 *         required: false
 *         description: |
 *           ถ้าเป็น true จะ filter status เฉพาะ WAITING | false จะ filter status ทุกสถานะ ยกเว้น WAITING และ FINISHED/COMPLETED | ไม่ใส่ = ทุกสถานะ
 *       - in: query
 *         name: store_type
 *         schema:
 *           type: string
 *         required: false
 *         description: filter ตาม store_type (ถ้าไม่ส่งจะดึงทั้งหมด)
 *       - in: query
 *         name: mc_code
 *         schema:
 *           type: string
 *         required: false
 *         description: filter ตาม mc_code (ถ้าไม่ส่งจะดึงทั้งหมด)
 *     responses:
 *       200:
 *         description: พบข้อมูลรายการ order return
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลรายการ order return ที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get(
    '/get-return-all',
    authenticateToken,
    allOrderController.getReturnAll
);

/**
 * @swagger
 * /api/orders/get-transfer-all:
 *   get:
 *     summary: ดึงข้อมูลรายการ order transfer filter status / store_type / mc_code
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: query
 *         name: isExecution
 *         schema:
 *           type: boolean
 *         required: false
 *         description: |
 *           ถ้าเป็น true จะ filter status เฉพาะ WAITING | false จะ filter status ทุกสถานะ ยกเว้น WAITING และ FINISHED/COMPLETED | ไม่ใส่ = ทุกสถานะ
 *       - in: query
 *         name: store_type
 *         schema:
 *           type: string
 *         required: false
 *         description: filter ตาม store_type (ถ้าไม่ส่งจะดึงทั้งหมด)
 *       - in: query
 *         name: mc_code
 *         schema:
 *           type: string
 *         required: false
 *         description: filter ตาม mc_code (ถ้าไม่ส่งจะดึงทั้งหมด)
 *     responses:
 *       200:
 *         description: พบข้อมูลรายการ order transfer
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลรายการ order transfer ที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get(
    '/get-transfer-all',
    authenticateToken,
    allOrderController.getTransferAll
);

/**
 * @swagger
 * /api/orders/get-status-all:
 *   get:
 *     summary: ดึงข้อมูลรายการ order status filter status / store_type / mc_code / type
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: query
 *         name: isExecution
 *         schema:
 *           type: boolean
 *         required: false
 *         description: |
 *           ถ้าเป็น true จะ filter status เฉพาะ WAITING | false จะ filter status ทุกสถานะ ยกเว้น WAITING | ไม่ใส่ = ทุกสถานะ
 *       - in: query
 *         name: store_type
 *         schema:
 *           type: string
 *         required: false
 *         description: filter ตาม store_type (ถ้าไม่ส่งจะดึงทั้งหมด)
 *       - in: query
 *         name: mc_code
 *         schema:
 *           type: string
 *         required: false
 *         description: filter ตาม mc_code (ถ้าไม่ส่งจะดึงทั้งหมด)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         required: false
 *         description: filter ตาม type (ถ้าไม่ส่งจะดึงทั้งหมด) | RECEIPT | USAGE | TRANSFER | RETURN
 *     responses:
 *       200:
 *         description: พบข้อมูลรายการ order status
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลรายการ order status ที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get(
    '/get-status-all',
    authenticateToken,
    allOrderController.getStatusAll
);

/**
 * @swagger
 * /api/orders/update-execution-mode:
 *   put:
 *     summary: อัปเดต execution_mode ของ order หลายรายการ (AUTO / MANUAL)
 *     tags: [Orders]
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
 *             required: [orders]
 *             properties:
 *               orders:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [order_id, execution_mode]
 *                   properties:
 *                     order_id:
 *                       type: number
 *                       example: 4438
 *                     execution_mode:
 *                       type: string
 *                       enum: [AUTO, MANUAL]
 *                       example: AUTO
 *     responses:
 *       200:
 *         description: อัปเดต execution_mode สำเร็จ
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูล order
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.put(
    '/update-execution-mode',
    authenticateToken,
    orderController.updateExecutionModeMany
);


export default router;