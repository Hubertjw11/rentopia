import "./database";
import { prisma } from "../../src/lib/prisma";

let sequence = 0;
const unique = (prefix: string) => `${prefix}-${++sequence}`;

export const makeManager = (cognitoId = unique("manager")) =>
  prisma.manager.create({
    data: {
      cognitoId,
      name: cognitoId,
      email: `${cognitoId}@example.com`,
      phoneNumber: "08000000000",
    },
  });

export const makeTenant = (cognitoId = unique("tenant")) =>
  prisma.tenant.create({
    data: {
      cognitoId,
      name: cognitoId,
      email: `${cognitoId}@example.com`,
      phoneNumber: "08111111111",
    },
  });

const makeLocation = async (address: string) => {
  const [row] = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO "Location" ("address","city","state","country","postalCode","coordinates")
    VALUES (${address}, 'Jakarta Barat', 'DKI Jakarta', 'Indonesia', '11480',
            ST_SetSRID(ST_MakePoint(106.78741, -6.19427), 4326))
    RETURNING id
  `;
  return row.id;
};

export const makeProperty = async (
  managerCognitoId: string,
  overrides: Partial<{ name: string; price: number; rentalPeriod: "Daily" | "Weekly" | "Monthly" | "Yearly" }> = {},
) => {
  const name = overrides.name ?? unique("property");
  const locationId = await makeLocation(`Jalan ${name}`);

  return prisma.property.create({
    data: {
      name,
      description: "A property created by a test.",
      price: overrides.price ?? 5_000_000,
      rentalPeriod: overrides.rentalPeriod ?? "Monthly",
      securityDeposit: 5_000_000,
      applicationFee: 250_000,
      photoUrls: ["https://example.com/photo.jpg"],
      amenities: ["WiFi"],
      highlights: ["CloseToTransit"],
      isPetsAllowed: false,
      isParkingIncluded: true,
      beds: 2,
      baths: 1,
      areaSqm: 45,
      propertyType: "Apartment",
      locationId,
      managerCognitoId,
    },
    include: { location: true },
  });
};

export const makeLease = (propertyId: number, tenantCognitoId: string) =>
  prisma.lease.create({
    data: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86_400_000),
      rent: 5_000_000,
      deposit: 5_000_000,
      propertyId,
      tenantCognitoId,
    },
  });

export const makeApplication = (propertyId: number, tenantCognitoId: string) =>
  prisma.application.create({
    data: {
      applicationDate: new Date(),
      status: "Pending",
      propertyId,
      tenantCognitoId,
      name: tenantCognitoId,
      email: `${tenantCognitoId}@example.com`,
      phoneNumber: "08111111111",
      durationPeriods: 6,
    },
  });

export const makeConversation = (
  propertyId: number,
  tenantCognitoId: string,
  managerCognitoId: string,
) =>
  prisma.conversation.create({
    data: { propertyId, tenantCognitoId, managerCognitoId },
  });

export const makeMessage = (conversationId: number, senderCognitoId: string) =>
  prisma.message.create({
    data: { conversationId, senderCognitoId, body: "Original text" },
  });

export const makeViewingSlot = (
  propertyId: number,
  overrides: Partial<{ hoursFromNow: number; mode: "InPerson" | "Virtual"; meetingUrl: string }> = {},
) =>
  prisma.viewingSlot.create({
    data: {
      propertyId,
      startsAt: new Date(Date.now() + (overrides.hoursFromNow ?? 24) * 3_600_000),
      durationMinutes: 30,
      mode: overrides.mode ?? "InPerson",
      meetingUrl: overrides.meetingUrl ?? null,
    },
  });

export { prisma };