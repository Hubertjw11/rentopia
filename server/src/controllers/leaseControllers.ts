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

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }
    if (property.managerCognitoId !== req.user!.id) {
      res.status(403).json({ message: "Access Denied!" });
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

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }
    if (property.managerCognitoId !== req.user!.id) {
      res.status(403).json({ message: "Access Denied!" });
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

    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { property: true },
    });

    if (!lease) {
      res.status(404).json({ message: "Lease not found" });
      return;
    }

    const requesterId = req.user!.id;
    const allowed =
      requesterId === lease.tenantCognitoId ||
      requesterId === lease.property.managerCognitoId;
    if (!allowed) {
      res.status(403).json({ message: "Access Denied!" });
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
