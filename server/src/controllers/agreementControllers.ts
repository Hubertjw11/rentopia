import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import archiver = require("archiver");
import { AgreementData, generateAgreementBuffer } from "../utils/pdfGenerator";
import { parseId } from "../lib/params";

const leaseInclude = {
  tenant: true,
  property: {
    include: { location: true, manager: true },
  },
} as const;

const toAgreementData = (lease: any): AgreementData => ({
  lease: {
    id: lease.id,
    startDate: lease.startDate,
    endDate: lease.endDate,
    rent: lease.rent,
    deposit: lease.deposit,
  },
  property: {
    name: lease.property.name,
    rentalPeriod: lease.property.rentalPeriod,
    isPetsAllowed: lease.property.isPetsAllowed,
    isParkingIncluded: lease.property.isParkingIncluded,
    location: lease.property.location,
  },
  tenant: lease.tenant,
  manager: lease.property.manager,
});

const safeName = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

export const downloadLeaseAgreement = async (
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
      include: leaseInclude,
    });

    if (!lease) {
      res.status(404).json({ message: "Lease not found" });
      return;
    }


    const pdf = await generateAgreementBuffer(toAgreementData(lease));
    const filename = `rentopia-agreement-${String(lease.id).padStart(5, "0")}-${safeName(lease.property.name)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdf.length);
    res.send(pdf);
  } catch (error) {
    console.error("downloadLeaseAgreement failed:", error);
    res.status(500).json({ message: "Error generating agreement" });
  }
};

/** ZIP of every lease agreement for one property (manager only). */
export const downloadPropertyAgreements = async (
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
      select: { id: true, name: true },
    });
    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    const leases = await prisma.lease.findMany({
      where: { propertyId },
      include: leaseInclude,
      orderBy: { startDate: "desc" },
    });

    if (leases.length === 0) {
      res.status(404).json({ message: "No leases found for this property" });
      return;
    }

    const zipName = `rentopia-agreements-${safeName(property.name)}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err: Error) => {
      console.error("archive failed:", err);
      res.destroy(err);
    });
    archive.pipe(res);

    for (const lease of leases) {
      const pdf = await generateAgreementBuffer(toAgreementData(lease));
      archive.append(pdf, {
        name: `agreement-${String(lease.id).padStart(5, "0")}-${safeName(lease.tenant.name)}.pdf`,
      });
    }

    await archive.finalize();
  } catch (error) {
    console.error("downloadPropertyAgreements failed:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Error generating agreements" });
    }
  }
};
