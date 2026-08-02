import express from "express";
import multer from "multer";
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get("/unread-count", anyUser, getUnreadMessageCount);
router.get("/search", anyUser, searchMessages);
router.get("/", anyUser, listConversations);
router.post("/", anyUser, createConversation);
router.get("/:id/messages", anyUser, getMessages);
router.post("/:id/messages", anyUser, upload.single("attachment"), sendMessage);
router.post("/:id/messages/delete", anyUser, deleteMessages);
router.patch("/:id/messages/:messageId", anyUser, editMessage);
router.delete("/:id", anyUser, deleteConversation);

export default router;
