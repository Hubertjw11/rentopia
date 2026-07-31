import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { wktToGeoJSON } from "@terraformer/wkt";

export const getManager = async (
  req: Request<{ cognitoId: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const manager = await prisma.manager.findUnique({
      where: { cognitoId },
    });

    if (manager) {
      res.json(manager);
    } else {
      res.status(404).json({ message: "Manager not found" });
    }
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

    const locationIds = properties.map((p) => p.location.id);
    const rows = locationIds.length
      ? await prisma.$queryRaw<{ id: number; coordinates: string }[]>`
          SELECT id, ST_AsText(coordinates) AS coordinates
          FROM "Location" WHERE id IN (${Prisma.join(locationIds)})`
      : [];
    const wktById = new Map(rows.map((r) => [r.id, r.coordinates]));

    const propertiesWithFormattedLocation = properties.map((property) => {
      const geoJSON: any = wktToGeoJSON(
        wktById.get(property.location.id) || "",
      );
      return {
        ...property,
        location: {
          ...property.location,
          coordinates: {
            longitude: geoJSON?.coordinates?.[0],
            latitude: geoJSON?.coordinates?.[1],
          },
        },
      };
    });

    res.json(propertiesWithFormattedLocation);
  } catch (error) {
    console.error("Error retrieving manager properties:", error);
    res.status(500).json({ message: "Error retrieving manager properties" });
  }
};
