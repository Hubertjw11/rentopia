import express from "express";
import {
  getManager,
  createManager,
  updateManager,
  getManagerProperties,
} from "../controllers/managerControllers";
import { requireSelf } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/:cognitoId", requireSelf(), getManager);
router.put("/:cognitoId", requireSelf(), updateManager);
router.get("/:cognitoId/properties", requireSelf(), getManagerProperties);
router.post("/", createManager);

export default router;
