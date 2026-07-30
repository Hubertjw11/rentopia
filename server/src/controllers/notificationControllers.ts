import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const listNotifications = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { recipientId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json(notifications);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving notifications: ${error.message}` });
  }
};

export const getUnreadCount = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const count = await prisma.notification.count({
      where: { recipientId: req.user!.id, isRead: false },
    });
    res.json({ count });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error counting notifications: ${error.message}` });
  }
};

export const markAsRead = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    // updateMany scopes by recipient, so nobody can mark someone else's as read.
    const result = await prisma.notification.updateMany({
      where: { id: Number(req.params.id), recipientId: req.user!.id },
      data: { isRead: true },
    });

    if (result.count === 0) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }

    res.json({ message: "Marked as read" });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error updating notification: ${error.message}` });
  }
};

export const markAllAsRead = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await prisma.notification.updateMany({
      where: { recipientId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: `Marked ${result.count} as read` });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error updating notifications: ${error.message}` });
  }
};