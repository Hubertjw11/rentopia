import express from "express";
import {
  bookViewingSlot,
  cancelViewingBooking,
  deleteViewingSlot,
} from "../controllers/viewingControllers";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.delete("/:slotId", authMiddleware(["manager"]), deleteViewingSlot);
router.post("/:slotId/booking", authMiddleware(["tenant"]), bookViewingSlot);
router.delete(
  "/:slotId/booking",
  authMiddleware(["tenant"]),
  cancelViewingBooking,
);

export default router;