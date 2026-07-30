import { Prisma, NotificationType } from "@prisma/client";

type NotificationInput = {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
};

export const createNotification = (
  db: Prisma.TransactionClient,
  data: NotificationInput,
) => db.notification.create({ data });