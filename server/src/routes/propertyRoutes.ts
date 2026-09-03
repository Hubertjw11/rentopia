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
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});
const propertyUpload = upload.fields([
  { name: "photos" },
  { name: "panorama", maxCount: 1 },
]);

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
  propertyUpload,
  createProperty,
);
router.put(
  "/:id",
  authMiddleware(["manager"]),
  propertyUpload,
  updateProperty,
);

router.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ message: "Each file must be 15 MB or smaller" });
      return;
    }
    next(err);
  },
);

export default router;
