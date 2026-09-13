import { Router } from "express";
import { requireAuth, allowRoles } from "../middleware/authMiddleware.js";
import {
  listFarmers,
  getFarmer,
  farmerSurveys,
} from "../controllers/farmerController.js";
const router = Router();
router.use(requireAuth);
router.get(
  "/",
  allowRoles("COORDINATOR", "ADMIN", "FIELD_WORKER"),
  listFarmers,
);
router.get("/:id", getFarmer);
router.get("/:id/surveys", farmerSurveys);
export default router;
