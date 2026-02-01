import { Router } from 'express';
import { authenticateToken } from '../common/auth.token';
import * as importController from '../controllers/import_excel.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: ImportJson
 *   description: การจัดการข้อมูล import
 */


/**
 * @swagger
 * /api/import/create-usage-json:
 *   post:
 *     summary: Import Data from JSON(Excel Usage)
 *     tags: [ImportJson]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 spr_no:
 *                   type: string
 *                   example: "SPR24-101802"
 *                 requested_at:
 *                   type: string
 *                   example: "9/24/2024 10:26:15 AM"
 *                 requested_by:
 *                   type: string
 *                   example: "T23M702"
 *                 usage_num:
 *                   type: string
 *                   example: "6999"
 *                 usage_line:
 *                   type: string
 *                   example: "1"
 *                 invuse_status:
 *                   type: string
 *                   example: "ENTERED"
 *                 stock_item:
 *                   type: string
 *                   example: "BHS-CRI-02034"
 *                 item_desc:
 *                   type: string
 *                   example: "Activation unit, right, p/n: 293B465"
 *                 work_order:
 *                   type: string
 *                   example: "WO24-178617"
 *                 mc_code:
 *                   type: string
 *                   example: "T23M702"
 *                 loc:
 *                   type: string
 *                   example: "LMC-M240-STORE (BHS)"
 *                 box_loc:
 *                   type: string
 *                   example: "BHS-Basement"
 *                 usage_type:
 *                   type: string
 *                   example: "ISSUE"
 *                 plan_qty:
 *                   type: number
 *                   example: 1
 *                 cond:
 *                   type: string
 *                   example: "CAPITAL"
 *                 split:
 *                   type: number
 *                   example: 0
 *     responses:
 *       200:
 *         description: Import successful
 *       400:
 *         description: Invalid data
 *       500:
 *         description: Internal server error
 */
router.post('/create-usage-json', authenticateToken, importController.createUsageJson);

/**
 * @swagger
 * /api/import/create-receipt-json:
 *   post:
 *     summary: Import Data from JSON(Excel Receipt)
 *     tags: [ImportJson]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 po_num:
 *                   type: string
 *                   example: "7000"
 *                 requested_at:
 *                   type: string
 *                   example: "9/24/2024 10:26:15 AM"
 *                 object_id:
 *                   type: string
 *                   example: "1"
 *                 mc_code:
 *                   type: string
 *                   example: "T23M702"
 *                 loc:
 *                   type: string
 *                   example: "LMC-M240-STORE (BHS)"
 *                 box_loc:
 *                   type: string
 *                   example: "BHS-Basement"
 *                 plan_qty:
 *                   type: number
 *                   example: 1
 *                 cond:
 *                   type: string
 *                   example: "CAPITAL"
 *                 type:
 *                   type: string
 *                   example: "RECEIPT"
 *     responses:
 *       200:
 *         description: Import successful
 *       400:
 *         description: Invalid data
 *       500:
 *         description: Internal server error
 */
router.post('/create-receipt-json', authenticateToken, importController.createReceiptJson);

/**
 * @swagger
 * /api/import/create-return-json:
 *   post:
 *     summary: Import Data from JSON(Excel Return)
 *     tags: [ImportJson]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 spr_no:
 *                   type: string
 *                   example: "SPR24-101802"
 *                 requested_at:
 *                   type: string
 *                   example: "9/24/2024 10:26:15 AM"
 *                 requested_by:
 *                   type: string
 *                   example: "T23M702"
 *                 usage_num:
 *                   type: string
 *                   example: "6999"
 *                 usage_line:
 *                   type: string
 *                   example: "1"
 *                 stock_item:
 *                   type: string
 *                   example: "BHS-CRI-02034"
 *                 item_desc:
 *                   type: string
 *                   example: "Activation unit, right, p/n: 293B465"
 *                 work_order:
 *                   type: string
 *                   example: "WO24-178617"
 *                 mc_code:
 *                   type: string
 *                   example: "T23M702"
 *                 loc:
 *                   type: string
 *                   example: "LMC-M240-STORE (BHS)"
 *                 box_loc:
 *                   type: string
 *                   example: "BHS-Basement"
 *                 usage_type:
 *                   type: string
 *                   example: "ISSUE"
 *                 plan_qty:
 *                   type: number
 *                   example: 1
 *                 cond:
 *                   type: string
 *                   example: "CAPITAL"
 *     responses:
 *       200:
 *         description: Import successful
 *       400:
 *         description: Invalid data
 *       500:
 *         description: Internal server error
 */
router.post('/create-return-json', authenticateToken, importController.createReturnJson);

/**
 * @swagger
 * /api/import/create-item-json:
 *   post:
 *     summary: Import Data from JSON(Excel Item)
 *     tags: [ImportJson]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 mc_code:
 *                   type: string
 *                   example: "M280"
 *                 stock_item:
 *                   type: string
 *                   example: "AMPTB-BDS-13003"
 *                 item_desc:
 *                   type: string
 *                   example: "Relay Module (Control Module) #RM520"
 *                 order_unit:
 *                   type: string
 *                   example: "NO"
 *                 com_group:
 *                   type: string
 *                   example: "AA"
 *                 cond_en:
 *                   type: string
 *                   example: "Y"
 *                 item_status:
 *                   type: string
 *                   example: "ACTIVE"
 *                 catg_code:
 *                   type: string
 *                   example: "ELECTRICAL"
 *                 system:
 *                   type: string
 *                   example: "FS"
 *     responses:
 *       200:
 *         description: Import successful
 *       400:
 *         description: Invalid data
 *       500:
 *         description: Internal server error
 */
router.post('/create-item-json', authenticateToken, importController.createItemJson);

export default router;