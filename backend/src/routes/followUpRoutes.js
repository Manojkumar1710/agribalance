import { Router } from "express";
import {
  listFollowUps,
  createFollowUp,
  updateFollowUp,
} from "../controllers/followUpController.js";
import { requireAuth, allowRoles } from "../middleware/authMiddleware.js";
const router = Router();
router.use(requireAuth, allowRoles("FIELD_WORKER", "COORDINATOR", "ADMIN"));
router.get("/", listFollowUps);
router.post("/", createFollowUp);
router.put("/:id", updateFollowUp);
export default router;
