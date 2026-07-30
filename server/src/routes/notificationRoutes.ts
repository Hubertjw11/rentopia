import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationControllers";

const router = express.Router();

const anyUser = authMiddleware(["manager", "tenant"]);

// Specific paths before parameterised ones.
router.get("/unread-count", anyUser, getUnreadCount);
router.put("/read-all", anyUser, markAllAsRead);
router.get("/", anyUser, listNotifications);
router.put("/:id/read", anyUser, markAsRead);

export default router;