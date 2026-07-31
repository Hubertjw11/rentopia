import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { parseId } from "../lib/params";

const refreshPropertyRating = async (
  tx: Prisma.TransactionClient,
  propertyId: number,
) => {
  const agg = await tx.review.aggregate({
    where: { propertyId },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await tx.property.update({
    where: { id: propertyId },
    data: {
      averageRating: agg._avg.rating ?? 0,
      numberOfReviews: agg._count._all,
    },
  });
};

export const listReviews = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const propertyId = parseId(req.params.id);
    if (propertyId === null) {
      res.status(400).json({ message: "Invalid property id" });
      return;
    }

    const reviews = await prisma.review.findMany({
      where: { propertyId },
      orderBy: { createdAt: "desc" },
      include: { tenant: { select: { cognitoId: true, name: true } } },
    });

    res.json(reviews);
  } catch (error) {
    console.error("Error retrieving reviews:", error);
    res.status(500).json({ message: "Error retrieving reviews" });
  }
};

export const upsertReview = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const propertyId = parseId(req.params.id);
    if (propertyId === null) {
      res.status(400).json({ message: "Invalid property id" });
      return;
    }

    const tenantCognitoId = req.user!.id;
    const rating = Number(req.body.rating);
    const comment =
      typeof req.body.comment === "string" ? req.body.comment.trim() : null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res
        .status(400)
        .json({ message: "Rating must be a whole number from 1 to 5" });
      return;
    }

    const lease = await prisma.lease.findFirst({
      where: { propertyId, tenantCognitoId },
      select: { id: true },
    });
    if (!lease) {
      res.status(403).json({
        message: "Only tenants who have leased this property can review it",
      });
      return;
    }

    const review = await prisma.$transaction(async (tx) => {
      const saved = await tx.review.upsert({
        where: {
          propertyId_tenantCognitoId: { propertyId, tenantCognitoId },
        },
        update: { rating, comment },
        create: { propertyId, tenantCognitoId, rating, comment },
      });

      await refreshPropertyRating(tx, propertyId);
      return saved;
    });

    res.status(201).json(review);
  } catch (error) {
    console.error("Error saving review:", error);
    res.status(500).json({ message: "Error saving review" });
  }
};

export const deleteReview = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const reviewId = parseId(req.params.id);
    if (reviewId === null) {
      res.status(400).json({ message: "Invalid review id" });
      return;
    }

    const review = await prisma.review.findFirst({
      where: { id: reviewId, tenantCognitoId: req.user!.id },
      select: { id: true, propertyId: true },
    });
    if (!review) {
      res.status(404).json({ message: "Review not found" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.review.delete({ where: { id: review.id } });
      await refreshPropertyRating(tx, review.propertyId);
    });

    res.json({ message: "Review deleted" });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ message: "Error deleting review" });
  }
};