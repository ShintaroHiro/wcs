import { Router } from 'express';
import { authenticateToken } from '../common/auth.token';
import * as eventsController from '../controllers/events.controller'

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: การจัดการรายการ events
 */

/**
 * @swagger
 * /api/events/set-order-error/{order_id}:
 *   post:
 *     summary: เปลี่ยนสถานะ Order เป็น ERROR และอัปเดต WRS, Counter, Event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: number
 *         description: ไอดีของ order ที่ต้องการเปลี่ยนเป็น ERROR
 *     responses:
 *       200:
 *         description: เปลี่ยนสถานะ Order เป็น ERROR สำเร็จ
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้อง
 *       404:
 *         description: ไม่พบ Order
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.post(
    '/set-order-error/:order_id',
    authenticateToken,
    eventsController.setOrderError
);

/**
 * @swagger
 * /api/events/clear-order-error/{event_id}:
 *   post:
 *     summary: เปลี่ยนสถานะ Order เป็น CLEAR และอัปเดต WRS, Counter, Event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema:
 *           type: number
 *         description: ไอดีของ event ที่ต้องการ CLEAR
 *     responses:
 *       200:
 *         description: Clear order error และ resume workflow
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้อง
 *       404:
 *         description: ไม่พบ Event
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.post(
    '/clear-order-error/:event_id',
    authenticateToken,
    eventsController.clearOrderError
);

// /**
//  * @swagger
//  * /api/events/set-order-warning/{order_id}:
//  *   post:
//  *     summary: สร้าง Warning Event สำหรับ Order
//  *     tags: [Events]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - $ref: '#/components/parameters/lng'
//  *       - in: path
//  *         name: order_id
//  *         required: true
//  *         schema:
//  *           type: number
//  *         description: ไอดีของ order ที่ต้องการสร้าง Warning
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json
//  *         schema:
//  *           type: object
//  *           properties:
//  *             event_code:
//  *               type: string
//  *               example: SCAN_FEW
//  *               description: รหัสของ Warning Event เช่น SCAN_FEW, SCAN_MANY
//  *     responses:
//  *       200:
//  *         description: สร้าง Warning Event สำเร็จ
//  *       400:
//  *         description: ข้อมูลที่ส่งมาไม่ถูกต้อง
//  *       404:
//  *         description: ไม่พบ Order
//  *       500:
//  *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
//  */
// router.post(
//     '/set-order-warning/:order_id',
//     authenticateToken,
//     eventsController.setOrderWarning
// );

/**
 * @swagger
 * /api/events/get-all:
 *   get:
 *     summary: ดึงข้อมูลรายการ events
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     responses:
 *       200:
 *         description: พบข้อมูลรายการ events 
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลรายการ events ที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get('/get-all'
    , authenticateToken
    , eventsController.getAll);

/**
 * @swagger
 * /api/events/by-related/{related_id}:
 *   get:
 *     summary: ดึงข้อมูล Orders จาก WRS ที่มีสถานะ ERROR ตาม related_id
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: path
 *         name: related_id
 *         schema:
 *           type: integer
 *         required: true
 *         description: wrs_id ที่ใช้ค้นหา wrs_code และ ERROR orders
 *     responses:
 *       200:
 *         description: พบข้อมูล
 *       400:
 *         description: พารามิเตอร์ไม่ถูกต้อง
 *       404:
 *         description: ไม่พบข้อมูล
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get(
    '/by-related/:related_id',
    authenticateToken,
    eventsController.getByRelatedId
);

/**
 * @swagger
 * /api/events/get-error-alert:
 *   get:
 *     summary: ดึงข้อมูลรายการ events ที่ error และ warning
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: query
 *         name: storeType
 *         required: false
 *         schema:
 *           type: string
 *           example: T1
 *         description: filter events ตาม store type
 *     responses:
 *       200:
 *         description: พบข้อมูลรายการ events ที่ error
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลรายการ events error ที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get('/get-error-alert'
    , authenticateToken
    , eventsController.getErrorAlert);

export default router;