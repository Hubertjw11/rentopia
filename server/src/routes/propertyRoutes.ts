import express from "express";
import {
  getProperties,
  getProperty,
  createProperty,
} from "../controllers/propertyControllers";
import multer from "multer";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getPropertyLeases,
  getPropertyPayments,
} from "../controllers/leaseControllers";
import { downloadPropertyAgreements } from "../controllers/agreementControllers";
import { listReviews, upsertReview } from "../controllers/reviewControllers";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

router.get("/", getProperties);
router.get("/:id/leases", authMiddleware(["manager"]), getPropertyLeases);
router.get("/:id/payments", authMiddleware(["manager"]), getPropertyPayments);
router.get("/:id/reviews", listReviews);
router.post("/:id/reviews", authMiddleware(["tenant"]), upsertReview);
router.get(
  "/:id/agreements",
  authMiddleware(["manager"]),
  downloadPropertyAgreements,
);
router.get("/:id", getProperty);
router.post(
  "/",
  authMiddleware(["manager"]),
  upload.array("photos"),
  createProperty,
);

export default router;
