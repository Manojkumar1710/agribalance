import { Router } from "express";
import { summary } from "../controllers/dashboardController.js";
import { requireAuth, allowRoles } from "../middleware/authMiddleware.js";
const router = Router();
router.get(
  "/summary",
  requireAuth,
  allowRoles("COORDINATOR", "ADMIN"),
  summary,
);
export default router;
