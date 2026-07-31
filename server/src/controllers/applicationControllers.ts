import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { createNotification } from "../lib/notify";
import { parseId } from "../lib/params";

export const listApplications = async (
  req: Request<{ cognitoId: string }>,
  res: Response,
): Promise<void> => {
  try {
    // Scope is derived from the verified token, never from the query string.
    const { id, role } = req.user!;
    const whereClause =
      role.toLowerCase() === "manager"
        ? { property: { managerCognitoId: id } }
        : { tenantCognitoId: id };

    const applications = await prisma.application.findMany({
      where: whereClause,
      include: {
        property: {
          include: {
            location: true,
            manager: true,
          },
        },
        tenant: true,
        lease: true,
      },
    });

    function calculateNextPaymentDate(startDate: Date): Date {
      const today = new Date();
      const nextPaymentDate = new Date(startDate);
      while (nextPaymentDate <= today) {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      }
      return nextPaymentDate;
    }

    const formattedApplications = applications.map((app) => ({
      ...app,
      property: {
        ...app.property,
        address: app.property.location.address,
      },
      manager: app.property.manager,
      lease: app.lease
        ? {
            ...app.lease,
            nextPaymentDate: calculateNextPaymentDate(app.lease.startDate),
          }
        : null,
    }));

    res.json(formattedApplications);
  } catch (error) {
    console.error("Error retrieving applications:", error);
    res.status(500).json({ message: "Error retrieving applications" });
  }
};

export const createApplication = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { applicationDate, propertyId, name, email, phoneNumber, message } =
      req.body;

    const parsedPropertyId = parseId(propertyId);
    if (parsedPropertyId === null) {
      res.status(400).json({ message: "A valid propertyId is required" });
      return;
    }

    const property = await prisma.property.findUnique({
      where: { id: parsedPropertyId },
      select: { id: true, name: true, managerCognitoId: true },
    });

    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    // No lease yet — a lease only exists once a manager approves.
    const newApplication = await prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          applicationDate: new Date(applicationDate),
          status: "Pending",
          name,
          email,
          phoneNumber,
          message,
          property: {
            connect: { id: parsedPropertyId },
          },
          tenant: {
            connect: { cognitoId: req.user!.id },
          },
        },
        include: {
          property: true,
          tenant: true,
        },
      });

      await createNotification(tx, {
        recipientId: property.managerCognitoId,
        type: "ApplicationSubmitted",
        title: "New application received",
        body: `${name} applied for ${property.name}.`,
        link: "/managers/applications",
      });

      return application;
    });

    res.status(201).json(newApplication);
  } catch (error) {
    console.error("Error creating application:", error);
    res.status(500).json({ message: "Error creating application" });
  }
};

export const updateApplicationStatus = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const applicationId = parseId(req.params.id);
    if (applicationId === null) {
      res.status(400).json({ message: "Invalid application id" });
      return;
    }
    const { status } = req.body;

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        property: true,
        tenant: true,
      },
    });

    if (!application) {
      res.status(404).json({ message: "Application not found." });
      return;
    }

    if (application.property.managerCognitoId !== req.user!.id) {
      res.status(403).json({ message: "Access Denied!" });
      return;
    }

    if (status === "Approved") {
      await prisma.$transaction(async (tx) => {
        const newLease = await tx.lease.create({
          data: {
            startDate: new Date(),
            endDate: new Date(
              new Date().setFullYear(new Date().getFullYear() + 1),
            ),
            rent: application.property.pricePerMonth,
            deposit: application.property.securityDeposit,
            propertyId: application.propertyId,
            tenantCognitoId: application.tenantCognitoId,
          },
        });

        await tx.property.update({
          where: { id: application.propertyId },
          data: {
            tenants: {
              connect: { cognitoId: application.tenantCognitoId },
            },
          },
        });

        await tx.application.update({
          where: { id: applicationId },
          data: { status, leaseId: newLease.id },
        });

        await createNotification(tx, {
          recipientId: application.tenantCognitoId,
          type: "ApplicationApproved",
          title: "Application approved",
          body: `Your application for ${application.property.name} has been approved.`,
          link: "/tenants/applications",
        });
      });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.application.update({
          where: { id: applicationId },
          data: { status },
        });

        if (status === "Denied") {
          await createNotification(tx, {
            recipientId: application.tenantCognitoId,
            type: "ApplicationDenied",
            title: "Application denied",
            body: `Your application for ${application.property.name} was not successful.`,
            link: "/tenants/applications",
          });
        }
      });
    }

    // Respond with the updated application details
    const updatedApplication = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        property: true,
        tenant: true,
        lease: true,
      },
    });

    res.json(updatedApplication);
  } catch (error) {
    console.error("Error updating application status:", error);
    res.status(500).json({ message: "Error updating application status" });
  }
};
