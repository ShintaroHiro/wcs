import { Router } from 'express';
import { authenticateToken , authenticateWCS} from '../common/auth.token';
import * as blockController from '../controllers/block.controller';
const router = Router();

/**
 * @swagger
 * tags:
 *   name: Block
 *   description: การจัดการ block
 */

/**
 * @swagger
 * /api/block/get-all-order-block-by-user:
 *   get:
 *     summary: ดึงข้อมูล block + order ของ user ที่ login เท่านั้น เฉพาะกรณี requester เท่านั้น
 *     tags: [Block]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     responses:
 *       200:
 *         description: พบข้อมูล block ของ user
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 *       404:
 *         description: ไม่พบ block ของ user
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get('/get-all-order-block-by-user',
    authenticateToken,
    blockController.getOrderAllBlockByUser
);

export default router;