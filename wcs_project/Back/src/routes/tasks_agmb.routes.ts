import { Router } from 'express';
import { authenticateToken } from '../common/auth.token';
import * as agmbStoreController from '../controllers/tasks_agmb.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: ExecutionAgmb
 *   description: การจัดการรายการ T1M
 */

/**
     * @swagger
     * /api/execution-agmb/change-to-processing:
     *   post:
     *     summary: เปลี่ยนสถานะรายการ order จาก PENDING เป็น PROCESSING แบบหลายรายการ
     *     tags: [ExecutionAgmb]
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
     *             properties:
     *               items:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     order_id:
     *                       type: snumbertring
     *                 example:
     *                   - order_id: "1"
     *                   - order_id: "2"
     *                   - order_id: "3"
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
        '/change-to-processing',
        authenticateToken,
        agmbStoreController.changeToProcessingBatch
    );

/**
     * @swagger
     * /api/execution-agmb/handle-order-item-agmb/{order_id}/{actual_qty}:
     *   post:
     *     summary: Ready to handle item for Agmb store
     *     tags: [ExecutionAgmb]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/lng'
     *       - in: path
     *         name: order_id
     *         required: true
     *         schema:
     *           type: number
     *         description: ไอดีรายการ order ที่ต้องการเปลี่ยนสถานะ
     *       - in: path
     *         name: actual_qty
     *         required: true
     *         schema:
     *           type: number
     *         description: ไอดีรายการ order ที่ต้องการเปลี่ยนสถานะ
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
        '/handle-order-item-agmb/:order_id/:actual_qty',
        authenticateToken,
        agmbStoreController.handleOrderItemAgmb
    );

      /**
     * @swagger
     * /api/execution-agmb/handle-error-order-item-agmb:
     *   post:
     *     summary: Clear error event and process multiple orders
     *     tags: [ExecutionAgmb]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - event_id
     *               - items
     *             properties:
     *               event_id:
     *                 type: number
     *                 example: 1
     *               items:
     *                 type: array
     *                 items:
     *                   type: object
     *                   required:
     *                     - order_id
     *                     - actual_qty
     *                   properties:
     *                     order_id:
     *                       type: number
     *                       example: 101
     *                     actual_qty:
     *                       type: number
     *                       example: 5
     *     responses:
     *       200:
     *         description: Error handled successfully
     *       400:
     *         description: Invalid request
     *       500:
     *         description: Server error
     */
    router.post(
        '/handle-error-order-item-agmb',
        authenticateToken,
        agmbStoreController.handleErrorOrderItemAgmb
    );

    
    /**
     * @swagger
     * /api/execution-agmb/handle-manual-order-item-agmb:
     *   post:
     *     summary: Ready to handle manual items for T1M store (multiple orders)
     *     tags: [ExecutionAgmb]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: array
     *             items:
     *               type: object
     *               properties:
     *                 order_id:
     *                   type: number
     *                   description: ไอดีรายการ order ที่เป็น manual
     *                 actual_qty:
     *                   type: number
     *                   description: จำนวนจริงที่ต้องการบันทึก
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
        '/handle-manual-order-item-agmb',
        authenticateToken,
        agmbStoreController.handleManualOrder
    );

export default router;
