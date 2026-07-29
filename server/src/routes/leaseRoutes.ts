import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { getLeasePayments, getLeases } from "../controllers/leaseControllers";
import { downloadLeaseAgreement } from "../controllers/agreementControllers";

const router = express.Router();

router.get("/", authMiddleware(["manager", "tenant"]), getLeases);
router.get(
  "/:id/payments",
  authMiddleware(["manager", "tenant"]),
  getLeasePayments,
);
router.get(
  "/:id/agreement",
  authMiddleware(["manager", "tenant"]),
  downloadLeaseAgreement,
);

export default router;
