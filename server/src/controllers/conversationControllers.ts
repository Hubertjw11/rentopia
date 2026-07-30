import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { parseId } from "../lib/params";

const asParticipant = (userId: string) => ({
  OR: [{ tenantCognitoId: userId }, { managerCognitoId: userId }],
});

export const listConversations = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const conversations = await prisma.conversation.findMany({
      where: asParticipant(userId),
      orderBy: { lastMessageAt: "desc" },
      include: {
        property: { select: { id: true, name: true, photoUrls: true } },
        tenant: { select: { cognitoId: true, name: true } },
        manager: { select: { cognitoId: true, name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    const unread = await prisma.message.groupBy({
      by: ["conversationId"],
      where: {
        conversationId: { in: conversations.map((c) => c.id) },
        senderCognitoId: { not: userId },
        readAt: null,
      },
      _count: { _all: true },
    });

    const unreadByConversation = new Map(
      unread.map((u) => [u.conversationId, u._count._all]),
    );

    res.json(
      conversations.map(({ messages, ...conversation }) => ({
        ...conversation,
        lastMessage: messages[0] ?? null,
        unreadCount: unreadByConversation.get(conversation.id) ?? 0,
      })),
    );
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving conversations: ${error.message}` });
  }
};

export const getUnreadMessageCount = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const count = await prisma.message.count({
      where: {
        senderCognitoId: { not: userId },
        readAt: null,
        conversation: asParticipant(userId),
      },
    });
    res.json({ count });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error counting messages: ${error.message}` });
  }
};

export const createConversation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role.toLowerCase();
    const { propertyId, tenantCognitoId } = req.body;

    const propertyIdNum = parseId(propertyId);
    if (propertyIdNum === null) {
      res.status(400).json({ message: "A valid propertyId is required" });
      return;
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyIdNum },
      select: { id: true, managerCognitoId: true },
    });
    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    let tenantId: string;
    if (role === "tenant") {
      tenantId = userId;
    } else {
      // A manager may only open a thread on a property they own.
      if (property.managerCognitoId !== userId) {
        res.status(403).json({ message: "Access Denied!" });
        return;
      }
      if (!tenantCognitoId) {
        res.status(400).json({ message: "tenantCognitoId is required" });
        return;
      }
      tenantId = tenantCognitoId;
    }

    const conversation = await prisma.conversation.upsert({
      where: {
        propertyId_tenantCognitoId: {
          propertyId: property.id,
          tenantCognitoId: tenantId,
        },
      },
      update: {},
      create: {
        propertyId: property.id,
        tenantCognitoId: tenantId,
        managerCognitoId: property.managerCognitoId,
      },
    });

    res.status(201).json(conversation);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error creating conversation: ${error.message}` });
  }
};

export const getMessages = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const conversationId = parseId(req.params.id);
    if (conversationId === null) {
      res.status(400).json({ message: "Invalid conversation id" });
      return;
    }
    const userId = req.user!.id;

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, ...asParticipant(userId) },
      select: { id: true },
    });
    if (!conversation) {
      res.status(404).json({ message: "Conversation not found" });
      return;
    }

    // Opening a thread marks the other party's messages read. Do this first so
    // the payload reflects the new state.
    await prisma.message.updateMany({
      where: { conversationId, senderCognitoId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    res.json(messages);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving messages: ${error.message}` });
  }
};

export const sendMessage = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const conversationId = parseId(req.params.id);
    if (conversationId === null) {
      res.status(400).json({ message: "Invalid conversation id" });
      return;
    }
    const userId = req.user!.id;
    const body = String(req.body.body ?? "").trim();

    if (!body) {
      res.status(400).json({ message: "Message body is required" });
      return;
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, ...asParticipant(userId) },
      select: { id: true },
    });
    if (!conversation) {
      res.status(404).json({ message: "Conversation not found" });
      return;
    }

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId, senderCognitoId: userId, body },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: created.createdAt },
      });

      return created;
    });

    res.status(201).json(message);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error sending message: ${error.message}` });
  }
};
