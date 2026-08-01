import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  listConversations,
  getUnreadMessageCount,
  createConversation,
  getMessages,
  sendMessage,
  deleteConversation,
  deleteMessages,
  searchMessages,
  editMessage,
} from "../controllers/conversationControllers";

const router = express.Router();

const anyUser = authMiddleware(["manager", "tenant"]);

// Specific paths before parameterised ones.
router.get("/unread-count", anyUser, getUnreadMessageCount);
router.get("/search", anyUser, searchMessages);
router.get("/", anyUser, listConversations);
router.post("/", anyUser, createConversation);
router.get("/:id/messages", anyUser, getMessages);
router.post("/:id/messages", anyUser, sendMessage);
router.post("/:id/messages/delete", anyUser, deleteMessages);
router.patch("/:id/messages/:messageId", anyUser, editMessage);
router.delete("/:id", anyUser, deleteConversation);

export default router;
