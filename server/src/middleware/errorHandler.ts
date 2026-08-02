import { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof MulterError) {
    console.error("Upload rejected:", err.code);
    res.status(400).json({
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "That file is too large"
          : "That upload was not accepted",
    });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
};