import express from "express";
import {
  getTenant,
  createTenant,
  updateTenant,
  getCurrentResidences,
  addFavoriteProperty,
  removeFavoriteProperty,
} from "../controllers/tenantControllers";
import {
  listPaymentMethods,
  createSetupIntent,
  savePaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod,
} from "../controllers/paymentMethodControllers";
import { requireSelf } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/:cognitoId", requireSelf(), getTenant);
router.put("/:cognitoId", requireSelf(), updateTenant);
router.post("/", createTenant);
router.get("/:cognitoId/current-residences", requireSelf(), getCurrentResidences);
router.post("/:cognitoId/favorites/:propertyId", requireSelf(), addFavoriteProperty);
router.delete("/:cognitoId/favorites/:propertyId", requireSelf(), removeFavoriteProperty);
router.get("/:cognitoId/payment-methods", requireSelf(), listPaymentMethods);
router.post("/:cognitoId/payment-methods/setup-intent", requireSelf(), createSetupIntent);
router.post("/:cognitoId/payment-methods", requireSelf(), savePaymentMethod);
router.put("/:cognitoId/payment-methods/:id/default", requireSelf(), setDefaultPaymentMethod);
router.delete("/:cognitoId/payment-methods/:id", requireSelf(), deletePaymentMethod);

export default router;
