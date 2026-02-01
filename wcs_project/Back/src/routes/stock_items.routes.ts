import { Router } from 'express';
import { authenticateToken } from '../common/auth.token';
import * as stockItemController from '../controllers/stock_items.controller'

const router = Router();

/**
 * @swagger
 * tags:
 *   name: StockItems
 *   description: การจัดการรายการ stock items
 */

/**
 * @swagger
 * /api/stock-items/create:
 *   post:
 *     summary: สร้างรายการ stock items
 *     tags: [StockItems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               stock_item:
 *                 type: string
 *                 description: Stock Item ID
 *                 example: "BHS-CRI-02034"
 *               item_desc:
 *                 type: string
 *                 description: Item description
 *                 example: "description"
 *               item_img:
 *                 type: string
 *                 format: binary
 *                 description: ไฟล์รูปภาพ stock item
 *     responses:
 *       201:
 *         description: สร้างข้อมูล stock items สำเร็จ
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูล stock items ที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.post('/create'
    , authenticateToken
    , stockItemController.create);

/**
 * @swagger
 * /api/stock-items/update/{item_id}:
 *   put:
 *     summary: แก้ไขรายการ stock items ที่มีอยู่
 *     tags: [StockItems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: path
 *         name: item_id
 *         schema:
 *           type: number
 *         required: true
 *         description: ไอดีรายการ stock items 
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               stock_item:
 *                 type: string
 *                 description: Stock Item ID
 *                 example: "BHS-CRI-02034"
 *               item_desc:
 *                 type: string
 *                 description: Item description
 *                 example: "description"
 *               item_img:
 *                 type: string
 *                 format: binary
 *                 description: ไฟล์รูปภาพ stock item
 *     responses:
 *       200:
 *         description: แก้ไขข้อมูล stock items สำเร็จ
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูล stock items ที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.put('/update/:item_id'
    , authenticateToken
    , stockItemController.update);

/**
 * @swagger
 * /api/stock-items/delete/{item_id}:
 *   delete:
 *     summary: ลบข้อมูลรายการ stock items ตามไอดีรายการ stock items 
 *     tags: [StockItems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: path
 *         name: item_id
 *         required: true
 *         schema:
 *           type: number
 *         description: ไอดีรายการ stock items ที่ต้องการลบ
 *     responses:
 *       200:
 *         description: ลบข้อมูลรายการ stock items สำเร็จ
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลรายการ stock items ที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.delete('/delete/:item_id'
    , authenticateToken
    , stockItemController.del);

/**
 * @swagger
 * /api/stock-items/delete-all:
 *   delete:
 *     summary: ลบข้อมูล stock items ทั้งหมด
 *     tags: [StockItems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     responses:
 *       200:
 *         description: ลบข้อมูล stock items ทั้งหมดสำเร็จ
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       401:
 *         description: ไม่มีสิทธิ์ใช้งาน (Unauthorized)
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.delete(
    '/delete-all',
    authenticateToken,
    stockItemController.delAll
);

/**
 * @swagger
 * /api/stock-items/get-all:
 *   get:
 *     summary: ดึงข้อมูลรายการ stock items
 *     tags: [StockItems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     responses:
 *       200:
 *         description: พบข้อมูลรายการ stock items 
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลรายการ stock items ที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get('/get-all'
    , authenticateToken
    , stockItemController.getAll);

/**
 * @swagger
 * /api/stock-items/get-by-id/{item_id}:
 *   get:
 *     summary: ดึงข้อมูลรายการ stock items ตามไอดี
 *     tags: [StockItems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: path
 *         name: item_id
 *         schema:
 *           type: number
 *         required: true
 *         description: ไอดีรายการ stock items
 *     responses:
 *       200:
 *         description: พบข้อมูลรายการ stock items
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลรายการที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get('/get-by-id/:item_id'
    , authenticateToken
    , stockItemController.getById);

export default router;