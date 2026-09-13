import { Router } from "express";
import {
  createSurvey,
  listSurveys,
  getSurvey,
  updateSurvey,
  deleteSurvey,
} from "../controllers/surveyController.js";
import { requireAuth, allowRoles } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { surveySchema } from "../validators/surveyValidators.js";
const router = Router();
router.use(requireAuth);
router.post(
  "/",
  allowRoles("FIELD_WORKER", "COORDINATOR", "ADMIN"),
  validate(surveySchema),
  createSurvey,
);
router.get(
  "/",
  allowRoles("FIELD_WORKER", "COORDINATOR", "ADMIN"),
  listSurveys,
);
router.get("/:id", getSurvey);
router.put("/:id", updateSurvey);
router.delete("/:id", allowRoles("COORDINATOR", "ADMIN"), deleteSurvey);
export default router;
