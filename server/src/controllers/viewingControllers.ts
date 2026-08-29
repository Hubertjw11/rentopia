import { Request, Response } from "express";
import { ViewingMode } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { createNotification } from "../lib/notify";
import { parseId, parseNumber } from "../lib/params";

const MIN_MINUTES = 15;
const MAX_MINUTES = 240;

const ownedSlot = (slotId: number, managerId: string) =>
  prisma.viewingSlot.findFirst({
    where: { id: slotId, property: { managerCognitoId: managerId } },
    include: { property: { select: { id: true, name: true } } },
  });

export const listViewingSlots = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const propertyId = parseId(req.params.id);
    if (propertyId === null) {
      res.status(400).json({ message: "Invalid property id" });
      return;
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { managerCognitoId: true },
    });
    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    const slots = await prisma.viewingSlot.findMany({
      where: { propertyId, startsAt: { gt: new Date() } },
      orderBy: { startsAt: "asc" },
    });

    const viewerId = req.user?.id ?? null;
    const isManager = viewerId === property.managerCognitoId;

    res.json(
      slots.map((slot) => {
        const isBooker =
          slot.bookedByCognitoId !== null &&
          slot.bookedByCognitoId === viewerId;
        return {
          id: slot.id,
          propertyId: slot.propertyId,
          startsAt: slot.startsAt,
          durationMinutes: slot.durationMinutes,
          mode: slot.mode,
          isBooked: slot.bookedByCognitoId !== null,
          isMine: isBooker,
          bookedByCognitoId: isManager ? slot.bookedByCognitoId : null,
          meetingUrl: isManager || isBooker ? slot.meetingUrl : null,
        };
      }),
    );
  } catch (error) {
    console.error("Error listing viewing slots:", error);
    res.status(500).json({ message: "Error listing viewing slots" });
  }
};

export const createViewingSlot = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const propertyId = parseId(req.params.id);
    if (propertyId === null) {
      res.status(400).json({ message: "Invalid property id" });
      return;
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId, managerCognitoId: req.user!.id },
      select: { id: true },
    });
    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    const startsAt = new Date(req.body.startsAt);
    if (isNaN(startsAt.getTime())) {
      res.status(400).json({ message: "A valid start time is required" });
      return;
    }
    if (startsAt <= new Date()) {
      res.status(400).json({ message: "A viewing must be in the future" });
      return;
    }

    const durationMinutes = parseNumber(req.body.durationMinutes) ?? 30;
    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < MIN_MINUTES ||
      durationMinutes > MAX_MINUTES
    ) {
      res.status(400).json({ message: "Invalid viewing length" });
      return;
    }

    const mode = typeof req.body.mode === "string" ? req.body.mode.trim() : "";
    if (!(Object.values(ViewingMode) as string[]).includes(mode)) {
      res.status(400).json({ message: "Unknown viewing mode" });
      return;
    }

    const rawUrl =
      typeof req.body.meetingUrl === "string" ? req.body.meetingUrl.trim() : "";
    let meetingUrl: string | null = null;
    if (mode === ViewingMode.Virtual) {
      if (!/^https:\/\/\S+$/.test(rawUrl)) {
        res
          .status(400)
          .json({ message: "A virtual viewing needs an https meeting link" });
        return;
      }
      meetingUrl = rawUrl;
    }

    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
    const clash = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM "ViewingSlot"
      WHERE "propertyId" = ${propertyId}
        AND "startsAt" < ${endsAt}
        AND ("startsAt" + ("durationMinutes" * INTERVAL '1 minute')) > ${startsAt}
      LIMIT 1
    `;
    if (clash.length > 0) {
      res.status(409).json({ message: "That overlaps an existing viewing" });
      return;
    }

    const slot = await prisma.viewingSlot.create({
      data: {
        propertyId,
        startsAt,
        durationMinutes,
        mode: mode as ViewingMode,
        meetingUrl,
      },
    });

    res.status(201).json(slot);
  } catch (error) {
    console.error("Error creating viewing slot:", error);
    res.status(500).json({ message: "Error creating viewing slot" });
  }
};

export const deleteViewingSlot = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const slotId = parseId(req.params.slotId);
    if (slotId === null) {
      res.status(400).json({ message: "Invalid slot id" });
      return;
    }

    const slot = await ownedSlot(slotId, req.user!.id);
    if (!slot) {
      res.status(404).json({ message: "Viewing slot not found" });
      return;
    }

    if (slot.bookedByCognitoId) {
      await prisma.$transaction(async (tx) => {
        await tx.viewingSlot.delete({ where: { id: slotId } });
        await createNotification(tx, {
          recipientId: slot.bookedByCognitoId!,
          type: "ViewingCancelled",
          title: "Viewing cancelled",
          body: `Your viewing of ${slot.property.name} was cancelled by the manager.`,
          link: `/search/${slot.property.id}`,
        });
      });
    } else {
      await prisma.viewingSlot.delete({ where: { id: slotId } });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting viewing slot:", error);
    res.status(500).json({ message: "Error deleting viewing slot" });
  }
};

export const bookViewingSlot = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const slotId = parseId(req.params.slotId);
    if (slotId === null) {
      res.status(400).json({ message: "Invalid slot id" });
      return;
    }

    const slot = await prisma.viewingSlot.findUnique({
      where: { id: slotId },
      include: {
        property: {
          select: { id: true, name: true, managerCognitoId: true },
        },
      },
    });
    if (!slot) {
      res.status(404).json({ message: "Viewing slot not found" });
      return;
    }

    const tenantId = req.user!.id;

    const alreadyBooked = await prisma.viewingSlot.count({
      where: {
        propertyId: slot.propertyId,
        bookedByCognitoId: tenantId,
        startsAt: { gt: new Date() },
      },
    });
    if (alreadyBooked > 0) {
      res
        .status(409)
        .json({ message: "You already have a viewing booked here" });
      return;
    }

    const booked = await prisma.$transaction(async (tx) => {
      const claimed = await tx.viewingSlot.updateMany({
        where: {
          id: slotId,
          bookedByCognitoId: null,
          startsAt: { gt: new Date() },
        },
        data: { bookedByCognitoId: tenantId, bookedAt: new Date() },
      });
      if (claimed.count === 0) return null;

      await createNotification(tx, {
        recipientId: slot.property.managerCognitoId,
        type: "ViewingBooked",
        title: "Viewing booked",
        body: `A tenant booked a viewing of ${slot.property.name}.`,
        link: `/managers/properties/${slot.property.id}`,
      });

      return tx.viewingSlot.findUnique({ where: { id: slotId } });
    });

    if (!booked) {
      res.status(409).json({ message: "That slot has already been taken" });
      return;
    }

    res.json(booked);
  } catch (error) {
    console.error("Error booking viewing slot:", error);
    res.status(500).json({ message: "Error booking viewing slot" });
  }
};

export const cancelViewingBooking = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const slotId = parseId(req.params.slotId);
    if (slotId === null) {
      res.status(400).json({ message: "Invalid slot id" });
      return;
    }

    const slot = await prisma.viewingSlot.findFirst({
      where: { id: slotId, bookedByCognitoId: req.user!.id },
      include: {
        property: { select: { id: true, name: true, managerCognitoId: true } },
      },
    });
    if (!slot) {
      res.status(404).json({ message: "Viewing slot not found" });
      return;
    }

    const released = await prisma.$transaction(async (tx) => {
      const result = await tx.viewingSlot.updateMany({
        where: { id: slotId, bookedByCognitoId: req.user!.id },
        data: { bookedByCognitoId: null, bookedAt: null },
      });
      if (result.count === 0) return null;

      await createNotification(tx, {
        recipientId: slot.property.managerCognitoId,
        type: "ViewingCancelled",
        title: "Viewing cancelled",
        body: `A tenant cancelled their viewing of ${slot.property.name}.`,
        link: `/managers/properties/${slot.property.id}`,
      });

      return tx.viewingSlot.findUnique({ where: { id: slotId } });
    });

    if (!released) {
      res.status(404).json({ message: "Viewing slot not found" });
      return;
    }

    res.json(released);
  } catch (error) {
    console.error("Error cancelling viewing booking:", error);
    res.status(500).json({ message: "Error cancelling viewing booking" });
  }
};