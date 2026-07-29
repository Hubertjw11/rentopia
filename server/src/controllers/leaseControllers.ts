import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getLeases = async (
  req: Request,
  res: Response,
): Promise<void> => {
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
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving leases: ${error.message}` });
  }
};

export const getPropertyLeases = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const property = await prisma.property.findUnique({
      where: { id: Number(id) },
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
      where: { propertyId: Number(id) },
      include: { tenant: true },
    });
    res.json(leases);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving property leases: ${error.message}` });
  }
};

/** All payments across every lease on one property (manager only). */
export const getPropertyPayments = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const property = await prisma.property.findUnique({
      where: { id: Number(id) },
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
      where: { lease: { propertyId: Number(id) } },
    });
    res.json(payments);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving property payments: ${error.message}` });
  }
};

export const getLeasePayments = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const lease = await prisma.lease.findUnique({
      where: { id: Number(id) },
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
      where: { leaseId: Number(id) },
    });
    res.json(payments);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving lease payments: ${error.message}` });
  }
};