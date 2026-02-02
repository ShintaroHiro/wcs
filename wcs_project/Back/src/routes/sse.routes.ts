import { Router } from "express";
import { authenticateToken, authenticateWCS } from "../common/auth.token";
import { connectSSE, resetCounter, scanItem, scanBulk } from "../controllers/sse.controller";

const router = Router();



/**
 * listen SSE (ไม่ต้อง login)
 */
router.get("/:counterId", authenticateWCS, connectSSE);

/**
 * scan (ต้อง login)
 */
router.post(
  "/:counterId/scan",
  authenticateToken,
  scanItem
);

/**
 * reset scan
 */
router.post(
  "/:counterId/reset",
  authenticateToken,
  resetCounter
);

/**
 * bulk scan (scan=required)
 */
router.post(
  "/:counterId/scan-bulk",
  authenticateToken,
  scanBulk
);

export default router;
