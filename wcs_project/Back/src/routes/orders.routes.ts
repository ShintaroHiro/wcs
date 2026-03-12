import { Router } from 'express';
import { authenticateToken } from '../common/auth.token';
import * as orderController from '../controllers/orders.controller'

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Waiting
 *   description: การจัดการรายการ order
 */

/**
 * @swagger
 * /api/waiting/create:
 *   post:
 *     summary: สร้างรายการ order (รองรับ batch)
 *     tags: [Waiting]
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
 *             required: [type, items]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [RECEIPT, USAGE, RETURN, TRANSFER]
 *                 example: USAGE
 *
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [item_id, mc_code, loc_id]
 *                   properties:
 *                     item_id:
 *                       type: number
 *                       example: 1
 *                     mc_code:
 *                       type: string
 *                       example: "MC01"
 *                     loc_id:
 *                       type: number
 *                       example: 10
 *                     cond:
 *                       type: string
 *                       example: "CAPITAL"
 *                     plan_qty:
 *                       type: number
 *                       example: 5
 *                     usage:
 *                       type: object
 *                       description: ใช้เมื่อ type = USAGE
 *                       properties:
 *                         work_order:
 *                           type: string
 *                           example: "WO20251109-001"
 *                         usage_num:
 *                           type: string
 *                           example: "6999"
 *                         spr_no:
 *                           type: string
 *                           example: "spr-001"
 *                         usage_line:
 *                           type: string
 *                           example: "1"
 *                         usage_type:
 *                           type: string
 *                           example: "ISSUE"
 *                         split:
 *                           type: number
 *                           example: 0
 *
 *                     receipt:
 *                       type: object
 *                       description: ใช้เมื่อ type = RECEIPT
 *                       properties:
 *                         unit_cost_handled:
 *                           type: number
 *                           format: float
 *                           example: 12500.5
 *                         contract_num:
 *                           type: string
 *                           example: "T23M311"
 *                         po_num:
 *                           type: string
 *                           example: "PO1094940"
 *                         object_id:
 *                           type: string
 *                           example: "61270"
 *
 *                     return:
 *                       type: object
 *                       description: ใช้เมื่อ type = RETURN
 *                       properties:
 *                         inv_id:
 *                           type: string
 *                           example: "1"
 *                         usage_id:
 *                           type: string
 *                           example: "1"
 *
 *                     transfer:
 *                       type: object
 *                       description: ใช้เมื่อ type = TRANSFER
 *                       properties:
 *                         contract_num:
 *                           type: string
 *                           example: "T23M311"
 *                         po_num:
 *                           type: string
 *                           example: "PO1094940"
 *                         object_id:
 *                           type: string
 *                           example: "61270"
 *     responses:
 *       201:
 *         description: สร้างข้อมูล order สำเร็จ
 *       400:
 *         description: ข้อมูลไม่ครบ หรือไม่ถูกต้อง
 *       404:
 *         description: ไม่พบข้อมูล
 *       500:
 *         description: เซิร์ฟเวอร์ผิดพลาด
 */
router.post('/create',
    authenticateToken,
    orderController.create
);


/**
 * @swagger
 * /api/waiting/update:
 *   put:
 *     summary: แก้ไขรายการ order (รองรับ batch)
 *     tags: [Waiting]
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
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [order_id]
 *                   properties:
 *                     order_id:
 *                       type: number
 *                       example: 1001
 *                     item_id:
 *                       type: number
 *                       example: 1
 *                     mc_code:
 *                       type: string
 *                       example: "MC01"
 *                     loc_id:
 *                       type: number
 *                       example: 10
 *                     cond:
 *                       type: string
 *                       example: "CAPITAL"
 *                     plan_qty:
 *                       type: number
 *                       example: 5
 *                     usage:
 *                       type: object
 *                       description: ใช้เมื่อ type = USAGE
 *                       properties:
 *                         work_order:
 *                           type: string
 *                           example: "WO20251109-001"
 *                         usage_num:
 *                           type: string
 *                           example: "6999"
 *                         spr_no:
 *                           type: string
 *                           example: "spr-001"
 *                         usage_line:
 *                           type: string
 *                           example: "1"
 *                         usage_type:
 *                           type: string
 *                           example: "ISSUE"
 *                         split:
 *                           type: number
 *                           example: 0
 *
 *                     receipt:
 *                       type: object
 *                       description: ใช้เมื่อ type = RECEIPT
 *                       properties:
 *                         unit_cost_handled:
 *                           type: number
 *                           format: float
 *                           example: 12500.5
 *                         contract_num:
 *                           type: string
 *                           example: "T23M311"
 *                         po_num:
 *                           type: string
 *                           example: "PO1094940"
 *                         object_id:
 *                           type: string
 *                           example: "61270"
 *
 *                     return:
 *                       type: object
 *                       description: ใช้เมื่อ type = RETURN
 *                       properties:
 *                         inv_id:
 *                           type: string
 *                           example: "1"
 *                         usage_id:
 *                           type: string
 *                           example: "1"
 *
 *                     transfer:
 *                       type: object
 *                       description: ใช้เมื่อ type = TRANSFER
 *                       properties:
 *                         contract_num:
 *                           type: string
 *                           example: "T23M311"
 *                         po_num:
 *                           type: string
 *                           example: "PO1094940"
 *                         object_id:
 *                           type: string
 *                           example: "61270"
 *     responses:
 *       200:
 *         description: แก้ไขข้อมูล order สำเร็จ
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูล order
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.put(
    '/update',
    authenticateToken,
    orderController.updateOrder
);


/**
 * @swagger
 * /api/waiting/delete:
 *   delete:
 *     summary: ลบข้อมูลรายการ order หลายรายการพร้อมกัน
 *     tags: [Waiting]
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
 *               - order_ids
 *             properties:
 *               order_ids:
 *                 type: array
 *                 items:
 *                   type: number
 *                 example: [1, 2, 3]
 *     responses:
 *       200:
 *         description: ลบข้อมูลรายการ order สำเร็จ
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลรายการ order ที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.delete(
    '/delete',
    authenticateToken,
    orderController.del
);

/**
 * @swagger
 * /api/waiting/return-import:
 *   post:
 *     summary: Change Return to Completed
 *     tags: [Waiting]
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
 *               - order_ids
 *             properties:
 *               order_ids:
 *                 type: array
 *                 items:
 *                   type: number
 *                 example: [101, 102, 103]
 *     responses:
 *       200:
 *         description: เปลี่ยนสถานะรายการ order สำเร็จ
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบรายการ order
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.post(
    '/return-import',
    authenticateToken,
    orderController.submitReturn
);

/**
 * @swagger
 * /api/waiting/transfer-import:
 *   post:
 *     summary: Change Transfer to Completed
 *     tags: [Waiting]
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
 *               - order_ids
 *             properties:
 *               order_ids:
 *                 type: array
 *                 items:
 *                   type: number
 *                 example: [101, 102, 103]
 *     responses:
 *       200:
 *         description: เปลี่ยนสถานะรายการ order สำเร็จ
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบรายการ order
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.post(
    '/transfer-import',
    authenticateToken,
    orderController.submitTransfer
);

/**
 * @swagger
 * /api/waiting/get-all:
 *   get:
 *     summary: ดึงข้อมูลรายการ order
 *     tags: [Waiting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     responses:
 *       200:
 *         description: พบข้อมูลรายการ order 
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลรายการ order ที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get('/get-all'
    , authenticateToken
    , orderController.getAll);

/**
 * @swagger
 * /api/waiting/get-usage-all:
 *   get:
 *     summary: ดึงข้อมูลรายการ order เฉพาะ Type Usage
 *     tags: [Waiting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
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
router.get('/get-usage-all'
    , authenticateToken
    , orderController.getUsageAll);

/**
 * @swagger
 * /api/waiting/get-usage-by-id/{order_id}:
 *   get:
 *     summary: ดึงข้อมูลรายการ order เฉพาะ Type Usage ตามไอดี
 *     tags: [Waiting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: path
 *         name: order_id
 *         schema:
 *           type: number
 *         required: true
 *         description: ไอดีรายการ order
 *     responses:
 *       200:
 *         description: พบข้อมูลรายการ order
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลรายการที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get('/get-usage-by-id/:order_id'
    , authenticateToken
    , orderController.getUsageById);


/**
 * @swagger
 * /api/waiting/get-receipt-all:
 *   get:
 *     summary: ดึงข้อมูลรายการ order เฉพาะ Type Receipt
 *     tags: [Waiting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
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
router.get('/get-receipt-all'
    , authenticateToken
    , orderController.getReceiptAll);

/**
 * @swagger
 * /api/waiting/get-receipt-by-id/{order_id}:
 *   get:
 *     summary: ดึงข้อมูลรายการ order เฉพาะ Type Receipt ตามไอดี
 *     tags: [Waiting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: path
 *         name: order_id
 *         schema:
 *           type: number
 *         required: true
 *         description: ไอดีรายการ order
 *     responses:
 *       200:
 *         description: พบข้อมูลรายการ order
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลรายการที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get('/get-receipt-by-id/:order_id'
    , authenticateToken
    , orderController.getReceiptById);

export default router;