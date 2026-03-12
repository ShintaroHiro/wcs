import { Router } from 'express';
import { authenticateToken } from '../common/auth.token';
import * as locationMasterController from '../controllers/locations.controller'

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Locations
 *   description: การจัดการรายการ location
 */
    
/**
 * @swagger
 * /api/locations/create:
 *   post:
 *     summary: สร้างรายการ location master
 *     tags: [Locations]
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
 *               store_type:
 *                 type: string
 *                 description: Source Store Location
 *                 example: "T1"
 *               loc:
 *                 type: string
 *                 description: Source Location
 *                 example: "AA Store"
 *               box_loc:
 *                 type: string
 *                 description: Source Box Location
 *                 example: "AGMB"
 *     responses:
 *       201:
 *         description: สร้างข้อมูล location master สำเร็จ
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูล location master ที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.post('/create'
    , authenticateToken
    , locationMasterController.create);

/**
 * @swagger
 * /api/locations/update/{loc_id}:
 *   put:
 *     summary: แก้ไขรายการ location master ที่มีอยู่
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: path
 *         name: loc_id
 *         schema:
 *           type: number
 *         required: true
 *         description: ไอดีรายการ location master 
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               store_type:
 *                 type: string
 *                 description: Source Store Location
 *                 example: "T1"
 *               loc:
 *                 type: string
 *                 description: Source Location
 *                 example: "BB Store"
 *               box_loc:
 *                 type: string
 *                 description: Source Box Location
 *                 example: "MFCS"
 *     responses:
 *       200:
 *         description: แก้ไขข้อมูล location master สำเร็จ
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูล location master ที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.put('/update/:loc_id'
    , authenticateToken
    , locationMasterController.update);

/**
 * @swagger
 * /api/locations/delete/{loc_id}:
 *   delete:
 *     summary: ลบข้อมูลรายการ location master ตามไอดีรายการ location master 
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: path
 *         name: loc_id
 *         required: true
 *         schema:
 *           type: number
 *         description: ไอดีรายการ location master ที่ต้องการลบ
 *     responses:
 *       200:
 *         description: ลบข้อมูลรายการ location master สำเร็จ
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลรายการ location master ที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.delete('/delete/:loc_id'
    , authenticateToken
    , locationMasterController.del);

/**
 * @swagger
 * /api/locations/delete-all:
 *   delete:
 *     summary: ลบข้อมูล location master ทั้งหมด
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     responses:
 *       200:
 *         description: ลบข้อมูล location master ทั้งหมดสำเร็จ
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
    locationMasterController.delAll
);

/**
 * @swagger
 * /api/locations/get-all:
 *   get:
 *     summary: ดึงข้อมูลรายการ location master
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     responses:
 *       200:
 *         description: พบข้อมูลรายการ location master 
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลรายการ location master ที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get('/get-all'
    , authenticateToken
    , locationMasterController.getAll);

/**
 * @swagger
 * /api/locations/get-by-id/{loc_id}:
 *   get:
 *     summary: ดึงข้อมูลรายการ location master ตามไอดี
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: path
 *         name: loc_id
 *         schema:
 *           type: number
 *         required: true
 *         description: ไอดีรายการ location master
 *     responses:
 *       200:
 *         description: พบข้อมูลรายการ location master
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลรายการที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get('/get-by-id/:loc_id'
    , authenticateToken
    , locationMasterController.getById);

/**
 * @swagger
 * /api/locations/search-location:
 *   get:
 *     summary: ค้นหาข้อมูล location ด้วย loc และ box_loc
 *     description: ค้นหาสถานที่เก็บของ
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: query
 *         name: loc
 *         schema:
 *           type: string
 *         description: ค้นหา location
 *       - in: query
 *         name: box_loc
 *         schema:
 *           type: string
 *         description: ค้นหา box location
 *     responses:
 *       200:
 *         description: พบข้อมูลรายการ location
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
 *       404:
 *         description: ไม่พบข้อมูลรายการที่ร้องขอ
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get('/search-location'
    , authenticateToken
    , locationMasterController.searchLocations);

export default router;