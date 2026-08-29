import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { withCoordinates } from "../lib/coordinates";
import { verifiedEmailFor } from "../lib/verifiedEmail";

export const getManager = async (
  req: Request<{ cognitoId: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const manager = await prisma.manager.findUnique({
      where: { cognitoId },
    });

    if (!manager) {
      res.status(404).json({ message: "Manager not found" });
      return;
    }

    const verifiedEmail = verifiedEmailFor(req.user);
    if (verifiedEmail !== manager.verifiedEmail) {
      res.json(
        await prisma.manager.update({
          where: { cognitoId },
          data: { verifiedEmail },
        }),
      );
      return;
    }

    res.json(manager);
  } catch (error) {
    console.error("Error retrieving manager:", error);
    res.status(500).json({ message: "Error retrieving manager" });
  }
};

export const createManager = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const cognitoId = req.user!.id;
    const { name, email, phoneNumber } = req.body;

    const manager = await prisma.manager.create({
      data: {
        cognitoId,
        name,
        email,
        phoneNumber,
        verifiedEmail: verifiedEmailFor(req.user),
      },
    });

    res.status(201).json(manager);
  } catch (error) {
    console.error("Error creating manager:", error);
    res.status(500).json({ message: "Error creating manager" });
  }
};

export const updateManager = async (
  req: Request<{ cognitoId: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const { name, email, phoneNumber } = req.body;

    const updateManager = await prisma.manager.update({
      where: { cognitoId },
      data: {
        name,
        email,
        phoneNumber,
      },
    });

    res.json(updateManager);
  } catch (error) {
    console.error("Error updating manager:", error);
    res.status(500).json({ message: "Error updating manager" });
  }
};

export const getManagerProperties = async (
  req: Request<{ cognitoId: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const properties = await prisma.property.findMany({
      where: { managerCognitoId: cognitoId },
      include: {
        location: true,
      },
    });

    res.json(await withCoordinates(properties));
  } catch (error) {
    console.error("Error retrieving manager properties:", error);
    res.status(500).json({ message: "Error retrieving manager properties" });
  }
};
