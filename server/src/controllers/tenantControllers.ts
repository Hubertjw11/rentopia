import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { wktToGeoJSON } from "@terraformer/wkt";
import { parseId } from "../lib/params";

export const getTenant = async (
  req: Request<{ cognitoId: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const tenant = await prisma.tenant.findUnique({
      where: { cognitoId },
      include: {
        favorites: true,
      },
    });

    if (tenant) {
      res.json(tenant);
    } else {
      res.status(404).json({ message: "Tenant not found" });
    }
  } catch (error) {
    console.error("Error retrieving tenant:", error);
    res.status(500).json({ message: "Error retrieving tenant" });
  }
};

export const createTenant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId, name, email, phoneNumber } = req.body;

    const tenant = await prisma.tenant.create({
      data: {
        cognitoId,
        name,
        email,
        phoneNumber,
      },
    });

    res.status(201).json(tenant);
  } catch (error) {
    console.error("Error creating tenant:", error);
    res.status(500).json({ message: "Error creating tenant" });
  }
};

export const updateTenant = async (
  req: Request<{ cognitoId: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const { name, email, phoneNumber } = req.body;

    const updateTenant = await prisma.tenant.update({
      where: { cognitoId },
      data: {
        name,
        email,
        phoneNumber,
      },
    });

    res.json(updateTenant);
  } catch (error) {
    console.error("Error updating tenant:", error);
    res.status(500).json({ message: "Error updating tenant" });
  }
};

export const getCurrentResidences = async (
  req: Request<{ cognitoId: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const properties = await prisma.property.findMany({
      where: { tenants: { some: { cognitoId } } },
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

    const residencesWithFormattedLocation = properties.map((property) => {
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

    res.json(residencesWithFormattedLocation);
  } catch (error) {
    console.error("Error retrieving current residences:", error);
    res.status(500).json({ message: "Error retrieving current residences" });
  }
};

export const addFavoriteProperty = async (
  req: Request<{ cognitoId: string; propertyId: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId, propertyId } = req.params;
    const tenant = await prisma.tenant.findUnique({
      where: { cognitoId },
      include: { favorites: true },
    });

    const propertyIdNumber = parseId(propertyId);
    if (propertyIdNumber === null) {
      res.status(400).json({ message: "Invalid property id" });
      return;
    }
    const existingFavorites = tenant?.favorites || [];

    if (!existingFavorites.some((fav) => fav.id === propertyIdNumber)) {
      const updatedTenant = await prisma.tenant.update({
        where: { cognitoId },
        data: {
          favorites: {
            connect: { id: propertyIdNumber },
          },
        },
        include: { favorites: true },
      });
      res.json(updatedTenant);
    } else {
      res.status(409).json({ message: "Property already added as favorite" });
    }
  } catch (error) {
    console.error("Error adding favorite property:", error);
    res.status(500).json({ message: "Error adding favorite property" });
  }
};

export const removeFavoriteProperty = async (
  req: Request<{ cognitoId: string; propertyId: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId, propertyId } = req.params;
    const propertyIdNumber = parseId(propertyId);
    if (propertyIdNumber === null) {
      res.status(400).json({ message: "Invalid property id" });
      return;
    }

    const updatedTenant = await prisma.tenant.update({
      where: { cognitoId },
      data: {
        favorites: {
          disconnect: { id: propertyIdNumber },
        },
      },
      include: { favorites: true },
    });

    res.json(updatedTenant);
  } catch (error) {
    console.error("Error removing favorite property:", error);
    res.status(500).json({ message: "Error removing favorite property" });
  }
};
