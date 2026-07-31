import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { deleteReview } from "../controllers/reviewControllers";

const router = express.Router();

router.delete("/:id", authMiddleware(["tenant"]), deleteReview);

export default router;