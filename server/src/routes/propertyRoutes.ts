import express from "express";
import {
  getProperties,
  getProperty,
  getPropertyMarkers,
  createProperty,
  updateProperty,
} from "../controllers/propertyControllers";
import multer from "multer";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getPropertyLeases,
  getPropertyPayments,
} from "../controllers/leaseControllers";
import { downloadPropertyAgreements } from "../controllers/agreementControllers";
import { listReviews, upsertReview } from "../controllers/reviewControllers";
import {
  listViewingSlots,
  createViewingSlot,
} from "../controllers/viewingControllers";
import { optionalAuth } from "../middleware/authMiddleware";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

router.get("/", getProperties);
router.get("/markers", getPropertyMarkers);
router.get("/:id/leases", authMiddleware(["manager"]), getPropertyLeases);
router.get("/:id/payments", authMiddleware(["manager"]), getPropertyPayments);
router.get("/:id/reviews", listReviews);
router.get("/:id/viewing-slots", optionalAuth, listViewingSlots);
router.post(
  "/:id/viewing-slots",
  authMiddleware(["manager"]),
  createViewingSlot,
);
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
router.put(
  "/:id",
  authMiddleware(["manager"]),
  upload.array("photos"),
  updateProperty,
);

export default router;
