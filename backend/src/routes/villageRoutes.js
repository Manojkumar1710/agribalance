import { Router } from "express";
import {
  listVillages,
  getVillage,
  compareVillages,
} from "../controllers/villageController.js";
import { requireAuth, allowRoles } from "../middleware/authMiddleware.js";
const router = Router();
router.use(requireAuth, allowRoles("COORDINATOR", "ADMIN"));
router.get("/", listVillages);
router.get("/compare", compareVillages);
router.get("/:village", getVillage);
export default router;
