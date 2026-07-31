import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { parseId } from "../lib/params";

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
  } catch (error) {
    console.error("Error retrieving notifications:", error);
    res.status(500).json({ message: "Error retrieving notifications" });
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
  } catch (error) {
    console.error("Error counting notifications:", error);
    res.status(500).json({ message: "Error counting notifications" });
  }
};

export const markAsRead = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const notificationId = parseId(req.params.id);
    if (notificationId === null) {
      res.status(400).json({ message: "Invalid notification id" });
      return;
    }

    // updateMany scopes by recipient, so nobody can mark someone else's as read.
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, recipientId: req.user!.id },
      data: { isRead: true },
    });

    if (result.count === 0) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }

    res.json({ message: "Marked as read" });
  } catch (error) {
    console.error("Error updating notification:", error);
    res.status(500).json({ message: "Error updating notification" });
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
  } catch (error) {
    console.error("Error updating notifications:", error);
    res.status(500).json({ message: "Error updating notifications" });
  }
};
