// routes/tasks.routes.ts
import { Router } from 'express';
import { authenticateToken } from '../common/auth.token';
import { OrchestratedTaskService } from '../services/tasks.service';
import { buildTasksController } from '../controllers/tasks.controller';

export default function createTasksRouter(orchestrator: OrchestratedTaskService) {
    const router = Router();
    const c = buildTasksController(orchestrator);

    /**
     * @swagger
     * tags:
     *   name: Execution
     *   description: จัดการงาน WCS (Orchestrated) สำหรับ T1M/T1
     */

    /**
     * @swagger
     * /api/execution/create:
     *   post:
     *     summary: สร้างงาน batch จากรายการ order_id และเริ่มต้น flow อัตโนมัติ
     *     tags: [Execution]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - items
     *             properties:
     *               items:
     *                 type: array
     *                 description: รายการ order ที่ต้องการสร้างงานแบบ batch
     *                 items:
     *                   type: object
     *                   required:
     *                     - order_id
     *                   properties:
     *                     order_id:
     *                       type: number
     *                       example: "1"
     *     responses:
     *       201:
     *         description: งานทั้งหมดถูกสร้างและเริ่ม process แล้ว
     *       400:
     *         description: ค่าที่ส่งมาไม่ถูกต้อง
     *       401:
     *         description: ไม่ได้ยืนยันตัวตน
     *       500:
     *         description: เกิดข้อผิดพลาดภายในระบบ
     */
    router.post('/create', authenticateToken, c.create);

    /**
     * @swagger
     * /api/execution/change-to-waiting:
     *   post:
     *     summary: เปลี่ยนสถานะรายการ order จาก PENDING เป็น WAITING แบบหลายรายการ
     *     tags: [Execution]
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
     *                       type: number
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
        '/change-to-waiting',
        authenticateToken,
        c.changeToWaitingBatch
    );

    /**
     * @swagger
     * /api/execution/change-to-pending:
     *   post:
     *     summary: เปลี่ยนสถานะรายการ order จาก WAITING เป็น PENDING แบบหลายรายการ แต่ไม่ได้ execution จริง
     *     tags: [Execution]
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
        '/change-to-pending',
        authenticateToken,
        c.changeToPendingBatch
    );

/**
 * @swagger
 * /api/execution/transfer-change-status:
 *   post:
 *     summary: เปลี่ยนสถานะรายการ order transfer แบบ batch
 *     tags: [Execution]
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
 *               - items
 *               - transfer_status
 *             properties:
 *               items:
 *                 type: array
 *                 description: รายการ order ที่ต้องการเปลี่ยนสถานะ
 *                 items:
 *                   type: object
 *                   required:
 *                     - order_id
 *                   properties:
 *                     order_id:
 *                       type: number
 *                       example: 1001
 *               transfer_status:
 *                 type: string
 *                 description: สถานะใหม่ของ transfer
 *                 example: CONFIRMED
 *           example:
 *             items:
 *               - order_id: 1001
 *               - order_id: 1002
 *               - order_id: 1003
 *             transfer_status: CONFIRMED
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
    '/transfer-change-status',
    authenticateToken,
    c.transferChangeToBatch
);

    /**
     * @swagger
     * /api/execution/handle-order-item/{order_id}/{actual_qty}:
     *   post:
     *     summary: Ready to handle item
     *     tags: [Execution]
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
        '/handle-order-item/:order_id/:actual_qty',
        authenticateToken,
        c.handleOrderItemMrs
    );

    /**
     * @swagger
     * /api/execution/handle-order-item-t1/{order_id}/{actual_qty}:
     *   post:
     *     summary: Ready to handle item for t1 store
     *     tags: [Execution]
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
        '/handle-order-item-t1/:order_id/:actual_qty',
        authenticateToken,
        c.handleOrderItemWRS
    );

    /**
     * @swagger
     * /api/execution/get-all:
     *   get:
     *     summary: ดึงข้อมูล Execution ทั้งหมด
     *     tags: [Execution]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/lng'
     *     responses:
     *       200:
     *         description: พบข้อมูล Execution 
     *       400:
     *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
     *       404:
     *         description: ไม่พบข้อมูล Execution ที่ร้องขอ
     *       500:
     *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
     */
    router.get('/get-all', authenticateToken, c.getAll);

    return router;
}
