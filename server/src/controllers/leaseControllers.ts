import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { parseId } from "../lib/params";

export const getLeases = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, role } = req.user!;
    const leases = await prisma.lease.findMany({
      where:
        role.toLowerCase() === "manager"
          ? { property: { managerCognitoId: id } }
          : { tenantCognitoId: id },
      include: {
        tenant: true,
        property: true,
      },
    });
    res.json(leases);
  } catch (error) {
    console.error("Error retrieving leases:", error);
    res.status(500).json({ message: "Error retrieving leases" });
  }
};

export const getPropertyLeases = async (
  req: Request<{ id: string }>,
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

    const leases = await prisma.lease.findMany({
      where: { propertyId },
      include: { tenant: true },
    });
    res.json(leases);
  } catch (error) {
    console.error("Error retrieving property leases:", error);
    res.status(500).json({ message: "Error retrieving property leases" });
  }
};

/** All payments across every lease on one property (manager only). */
export const getPropertyPayments = async (
  req: Request<{ id: string }>,
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

    const payments = await prisma.payment.findMany({
      where: { lease: { propertyId } },
    });
    res.json(payments);
  } catch (error) {
    console.error("Error retrieving property payments:", error);
    res.status(500).json({ message: "Error retrieving property payments" });
  }
};

export const getLeasePayments = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const leaseId = parseId(req.params.id);
    if (leaseId === null) {
      res.status(400).json({ message: "Invalid lease id" });
      return;
    }

    const lease = await prisma.lease.findFirst({
      where: {
        id: leaseId,
        OR: [
          { tenantCognitoId: req.user!.id },
          { property: { managerCognitoId: req.user!.id } },
        ],
      },
      select: { id: true },
    });
    if (!lease) {
      res.status(404).json({ message: "Lease not found" });
      return;
    }

    const payments = await prisma.payment.findMany({
      where: { leaseId },
    });
    res.json(payments);
  } catch (error) {
    console.error("Error retrieving lease payments:", error);
    res.status(500).json({ message: "Error retrieving lease payments" });
  }
};
