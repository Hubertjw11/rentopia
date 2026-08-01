import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { parseId, parseNumber } from "../lib/params";

const MAX_DELETE_BATCH = 100;
const DEFAULT_SEARCH_LIMIT = 30;
const MAX_SEARCH_LIMIT = 100;
const MIN_QUERY_LENGTH = 2;
const DEFAULT_MESSAGE_LIMIT = 30;
const MAX_MESSAGE_LIMIT = 300;

const asParticipant = (userId: string) => ({
  OR: [{ tenantCognitoId: userId }, { managerCognitoId: userId }],
});

const visibleTo = (userId: string) => ({
  OR: [{ senderCognitoId: { not: userId } }, { hiddenForSenderAt: null }],
});

const readConversationId = (
  req: Request<{ id: string }>,
  res: Response,
): number | null => {
  const conversationId = parseId(req.params.id);
  if (conversationId !== null) return conversationId;
  res.status(400).json({ message: "Invalid conversation id" });
  return null;
};

const assertParticipant = async (
  conversationId: number,
  userId: string,
  res: Response,
): Promise<boolean> => {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, ...asParticipant(userId) },
    select: { id: true },
  });
  if (conversation) return true;
  res.status(404).json({ message: "Conversation not found" });
  return false;
};

type ReplyPreview = {
  id: number;
  senderCognitoId: string;
  body: string;
  deletedAt: Date | null;
};

type MessageRow = {
  id: number;
  conversationId: number;
  senderCognitoId: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
  editedAt: Date | null;
  replyTo: ReplyPreview | null;
};

const toMessageDto = (m: MessageRow) => ({
  id: m.id,
  conversationId: m.conversationId,
  senderCognitoId: m.senderCognitoId,
  body: m.deletedAt ? "" : m.body,
  readAt: m.readAt,
  createdAt: m.createdAt,
  isDeleted: m.deletedAt !== null,
  isEdited: m.deletedAt === null && m.editedAt !== null,
  replyTo: m.replyTo
    ? {
        id: m.replyTo.id,
        senderCognitoId: m.replyTo.senderCognitoId,
        body: m.replyTo.deletedAt ? "" : m.replyTo.body,
        isDeleted: m.replyTo.deletedAt !== null,
      }
    : null,
});

const replyInclude = {
  replyTo: {
    select: { id: true, senderCognitoId: true, body: true, deletedAt: true },
  },
} as const;

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
        messages: {
          where: visibleTo(userId),
          orderBy: { createdAt: "desc" },
          take: 1,
          include: replyInclude,
        },
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
        lastMessage: messages[0] ? toMessageDto(messages[0]) : null,
        unreadCount: unreadByConversation.get(conversation.id) ?? 0,
      })),
    );
  } catch (error) {
    console.error("Error retrieving conversations:", error);
    res.status(500).json({ message: "Error retrieving conversations" });
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
  } catch (error) {
    console.error("Error counting messages:", error);
    res.status(500).json({ message: "Error counting messages" });
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
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ message: "Error creating conversation" });
  }
};

export const getMessages = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const conversationId = readConversationId(req, res);
    if (conversationId === null) return;

    const userId = req.user!.id;
    const requested = parseNumber(req.query.limit);
    const limit =
      requested === null || requested <= 0
        ? DEFAULT_MESSAGE_LIMIT
        : Math.min(Math.floor(requested), MAX_MESSAGE_LIMIT);

    if (!(await assertParticipant(conversationId, userId, res))) return;

    await prisma.message.updateMany({
      where: { conversationId, senderCognitoId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });

    const window = await prisma.message.findMany({
      where: { conversationId, ...visibleTo(userId) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: replyInclude,
    });

    const hasMore = window.length > limit;
    const messages = (hasMore ? window.slice(0, limit) : window)
      .reverse()
      .map(toMessageDto);

    res.json({ messages, hasMore });
  } catch (error) {
    console.error("Error retrieving messages:", error);
    res.status(500).json({ message: "Error retrieving messages" });
  }
};

export const sendMessage = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const conversationId = readConversationId(req, res);
    if (conversationId === null) return;

    const userId = req.user!.id;
    const body = String(req.body.body ?? "").trim();

    if (!body) {
      res.status(400).json({ message: "Message body is required" });
      return;
    }

    const rawReplyTo = req.body.replyToId;
    const replyToId =
      rawReplyTo === undefined || rawReplyTo === null
        ? null
        : parseId(rawReplyTo);
    if (rawReplyTo !== undefined && rawReplyTo !== null && replyToId === null) {
      res.status(400).json({ message: "Invalid replyToId" });
      return;
    }

    if (!(await assertParticipant(conversationId, userId, res))) return;

    if (replyToId !== null) {
      const parent = await prisma.message.findFirst({
        where: { id: replyToId, conversationId },
        select: { id: true },
      });
      if (!parent) {
        res.status(400).json({ message: "Cannot reply to that message" });
        return;
      }
    }

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId, senderCognitoId: userId, body, replyToId },
        include: replyInclude,
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: created.createdAt },
      });

      return created;
    });

    res.status(201).json(toMessageDto(message));
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Error sending message" });
  }
};

export const editMessage = async (
  req: Request<{ id: string; messageId: string }>,
  res: Response,
): Promise<void> => {
  try {
    const conversationId = parseId(req.params.id);
    const messageId = parseId(req.params.messageId);
    if (conversationId === null || messageId === null) {
      res.status(400).json({ message: "Invalid id" });
      return;
    }

    const body = String(req.body.body ?? "").trim();
    if (!body) {
      res.status(400).json({ message: "Message body is required" });
      return;
    }

    const userId = req.user!.id;

    if (!(await assertParticipant(conversationId, userId, res))) return;

    const result = await prisma.message.updateMany({
      where: {
        id: messageId,
        conversationId,
        senderCognitoId: userId,
        deletedAt: null,
      },
      data: { body, editedAt: new Date() },
    });

    if (result.count === 0) {
      res.status(404).json({ message: "Message not found" });
      return;
    }

    const updated = await prisma.message.findUnique({
      where: { id: messageId },
      include: replyInclude,
    });
    if (!updated) {
      res.status(404).json({ message: "Message not found" });
      return;
    }

    res.json(toMessageDto(updated));
  } catch (error) {
    console.error("Error editing message:", error);
    res.status(500).json({ message: "Error editing message" });
  }
};

export const searchMessages = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    if (q.length < MIN_QUERY_LENGTH) {
      res.json({ results: [], hasMore: false });
      return;
    }

    const requested = parseNumber(req.query.limit);
    const limit =
      requested === null || requested <= 0
        ? DEFAULT_SEARCH_LIMIT
        : Math.min(Math.floor(requested), MAX_SEARCH_LIMIT);

    const conversationId =
      req.query.conversationId === undefined
        ? null
        : parseId(req.query.conversationId);
    if (req.query.conversationId !== undefined && conversationId === null) {
      res.status(400).json({ message: "Invalid conversationId" });
      return;
    }

    const window = await prisma.message.findMany({
      where: {
        conversation: {
          ...asParticipant(userId),
          ...(conversationId !== null ? { id: conversationId } : {}),
        },
        deletedAt: null,
        ...visibleTo(userId),
        body: { contains: q, mode: "insensitive" },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: {
        conversation: {
          select: {
            id: true,
            property: { select: { name: true } },
            tenant: { select: { name: true } },
            manager: { select: { name: true } },
          },
        },
      },
    });

    const hasMore = window.length > limit;
    const rows = hasMore ? window.slice(0, limit) : window;

    res.json({
      results: rows.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderCognitoId: m.senderCognitoId,
        body: m.body,
        createdAt: m.createdAt,
        conversation: {
          id: m.conversation.id,
          propertyName: m.conversation.property.name,
          tenantName: m.conversation.tenant.name,
          managerName: m.conversation.manager.name,
        },
      })),
      hasMore,
    });
  } catch (error) {
    console.error("Error searching messages:", error);
    res.status(500).json({ message: "Error searching messages" });
  }
};

export const deleteConversation = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const conversationId = readConversationId(req, res);
    if (conversationId === null) return;

    const userId = req.user!.id;
    const result = await prisma.conversation.deleteMany({
      where: { id: conversationId, ...asParticipant(userId) },
    });

    if (result.count === 0) {
      res.status(404).json({ message: "Conversation not found" });
      return;
    }

    res.json({ message: "Conversation deleted" });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res.status(500).json({ message: "Error deleting conversation" });
  }
};

export const deleteMessages = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const conversationId = readConversationId(req, res);
    if (conversationId === null) return;

    const { scope } = req.body;
    if (scope !== "me" && scope !== "everyone") {
      res.status(400).json({ message: "scope must be 'me' or 'everyone'" });
      return;
    }

    const rawIds: unknown[] | null = Array.isArray(req.body.ids)
      ? (req.body.ids as unknown[])
      : null;
    if (!rawIds || rawIds.length === 0) {
      res.status(400).json({ message: "ids must be a non-empty array" });
      return;
    }
    if (rawIds.length > MAX_DELETE_BATCH) {
      res
        .status(400)
        .json({
          message: `Cannot delete more than ${MAX_DELETE_BATCH} at once`,
        });
      return;
    }

    const ids = rawIds.map(parseId).filter((id): id is number => id !== null);
    if (ids.length !== rawIds.length) {
      res.status(400).json({ message: "ids must all be valid message ids" });
      return;
    }

    const userId = req.user!.id;
    if (!(await assertParticipant(conversationId, userId, res))) return;

    const result = await prisma.message.updateMany({
      where: {
        id: { in: ids },
        conversationId,
        senderCognitoId: userId,
      },
      data:
        scope === "everyone"
          ? { deletedAt: new Date() }
          : { hiddenForSenderAt: new Date() },
    });

    if (result.count === 0) {
      res.status(404).json({ message: "No matching messages to delete" });
      return;
    }

    res.json({ count: result.count });
  } catch (error) {
    console.error("Error deleting messages:", error);
    res.status(500).json({ message: "Error deleting messages" });
  }
};
