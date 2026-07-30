import { NextFunction, Request, Response } from "express";

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

  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
};