import {
  PrismaClient,
  Amenity,
  Furnishing,
  Highlight,
  PropertyType,
  RentalPeriod,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — check server/.env");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const MANAGER = {
  cognitoId: "14284448-5011-70d6-5864-252dabfdf8bd",
  name: "eliza",
  email: "elizabenyama@gmail.com",
  phoneNumber: "0812345678",
};

type Listing = {
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    lng: number;
    lat: number;
  };
  property: {
    name: string;
    description: string;
    price: number;
    rentalPeriod: RentalPeriod;
    securityDeposit: number;
    applicationFee: number;
    photoUrls: string[];
    amenities: Amenity[];
    highlights: Highlight[];
    isPetsAllowed: boolean;
    isParkingIncluded: boolean;
    beds: number;
    baths: number;
    areaSqm: number;
    propertyType: PropertyType;
    furnishing: Furnishing | null;
    postedDate: Date;
  };
};

const LISTINGS: Listing[] = [
  {
    location: {
      address: "Jalan Kemanggisan Ilir III",
      city: "Jakarta Barat",
      state: "DKI Jakarta",
      country: "Indonesia",
      postalCode: "11480",
      lng: 106.78741299582288,
      lat: -6.194269641451967,
    },
    property: {
      name: "Kemanggisan Studio Near Campus",
      description:
        "Furnished studio a short walk from campus. Air-conditioned with fast internet included, private bathroom, and a small kitchenette. Suited to students or a single professional.",
      price: 2500000,
      rentalPeriod: RentalPeriod.Monthly,
      securityDeposit: 2500000,
      applicationFee: 150000,
      photoUrls: [
        "https://re-s3-images.s3.us-east-1.amazonaws.com/properties/763e3a3d-d72f-4d01-acd6-b56d35844364-studi.webp",
      ],
      amenities: [
        Amenity.AirConditioning,
        Amenity.WiFi,
        Amenity.Refrigerator,
        Amenity.Parking,
      ],
      highlights: [
        Highlight.HighSpeedInternetAccess,
        Highlight.CloseToTransit,
        Highlight.RecentlyRenovated,
      ],
      isPetsAllowed: false,
      isParkingIncluded: true,
      beds: 1,
      baths: 1,
      areaSqm: 24,
      propertyType: PropertyType.Rooms,
      furnishing: Furnishing.Full,
      postedDate: new Date("2026-08-26T03:27:44.588Z"),
    },
  },
  {
    location: {
      address: "Jalan Jenderal Sudirman Kav 25",
      city: "Jakarta Selatan",
      state: "DKI Jakarta",
      country: "Indonesia",
      postalCode: "12920",
      lng: 106.81788625257519,
      lat: -6.205710432162064,
    },
    property: {
      name: "Sudirman Park 2BR Apartment",
      description:
        "Two-bedroom unit on a high floor with a city view. Building has a pool and gym, and the MRT is a five-minute walk. Two months' deposit, minimum twelve-month term.",
      price: 8500000,
      rentalPeriod: RentalPeriod.Monthly,
      securityDeposit: 17000000,
      applicationFee: 250000,
      photoUrls: [
        "https://re-s3-images.s3.us-east-1.amazonaws.com/properties/8a9304cb-f35a-4cce-9096-c7c6a66b6c94-sudirman.jpg",
      ],
      amenities: [
        Amenity.AirConditioning,
        Amenity.Refrigerator,
        Amenity.Parking,
        Amenity.WasherDryer,
        Amenity.Pool,
        Amenity.Gym,
        Amenity.WiFi,
        Amenity.Microwave,
      ],
      highlights: [
        Highlight.HighSpeedInternetAccess,
        Highlight.CloseToTransit,
        Highlight.GreatView,
        Highlight.SmokeFree,
      ],
      isPetsAllowed: false,
      isParkingIncluded: true,
      beds: 2,
      baths: 1,
      areaSqm: 65,
      propertyType: PropertyType.Apartment,
      furnishing: null,
      postedDate: new Date("2026-08-26T03:36:06.567Z"),
    },
  },
  {
    location: {
      address: "Jalan Bintaro Utama Sektor 9",
      city: "Tangerang Selatan",
      state: "Banten",
      country: "Indonesia",
      postalCode: "15229",
      lng: 106.72302354283659,
      lat: -6.285316193057568,
    },
    property: {
      name: "Bintaro Sector 9 Family House",
      description:
        "Three-bedroom house in a quiet gated cluster with a small garden and carport for two. Recently repainted, unfurnished apart from wardrobes and kitchen units. Pets considered.",
      price: 12000000,
      rentalPeriod: RentalPeriod.Monthly,
      securityDeposit: 12000000,
      applicationFee: 300000,
      photoUrls: [
        "https://re-s3-images.s3.us-east-1.amazonaws.com/properties/e6be434f-f499-4685-9918-eb804082d68d-bintaro.jpg",
      ],
      amenities: [
        Amenity.AirConditioning,
        Amenity.Refrigerator,
        Amenity.Parking,
        Amenity.WasherDryer,
        Amenity.WiFi,
        Amenity.PetsAllowed,
        Amenity.HardwoodFloors,
      ],
      highlights: [
        Highlight.SmokeFree,
        Highlight.QuietNeighborhood,
        Highlight.RecentlyRenovated,
        Highlight.DoubleVanities,
      ],
      isPetsAllowed: true,
      isParkingIncluded: true,
      beds: 3,
      baths: 2,
      areaSqm: 130,
      propertyType: PropertyType.Townhouse,
      furnishing: Furnishing.Semi,
      postedDate: new Date("2026-08-26T03:55:07.945Z"),
    },
  },
  {
    location: {
      address: "Jalan Jenderal Sudirman Kav 52-53",
      city: "Jakarta Selatan",
      state: "DKI Jakarta",
      country: "Indonesia",
      postalCode: "12190",
      lng: 106.8112475428955,
      lat: -6.225320242803079,
    },
    property: {
      name: "The Capital Residence 3BR",
      description:
        "Fully furnished three-bedroom in the central business district. Concierge, 24-hour security, two parking bays. Walking distance to offices and the mall.",
      price: 35000000,
      rentalPeriod: RentalPeriod.Monthly,
      securityDeposit: 70000000,
      applicationFee: 500000,
      photoUrls: [
        "https://re-s3-images.s3.us-east-1.amazonaws.com/properties/77ccbf2e-ff86-404b-9ce5-34864e862cba-scbd.jpg",
      ],
      amenities: [
        Amenity.AirConditioning,
        Amenity.Dishwasher,
        Amenity.WasherDryer,
        Amenity.Pool,
        Amenity.Gym,
        Amenity.Parking,
        Amenity.WiFi,
        Amenity.WalkInClosets,
        Amenity.Refrigerator,
        Amenity.Microwave,
      ],
      highlights: [
        Highlight.GreatView,
        Highlight.HighSpeedInternetAccess,
        Highlight.Intercom,
        Highlight.SprinklerSystem,
        Highlight.DoubleVanities,
        Highlight.SmokeFree,
      ],
      isPetsAllowed: false,
      isParkingIncluded: true,
      beds: 3,
      baths: 3,
      areaSqm: 149,
      propertyType: PropertyType.Apartment,
      furnishing: Furnishing.Full,
      postedDate: new Date("2026-08-26T06:13:40.729Z"),
    },
  },
  {
    location: {
      address: "Jalan Ir. H. Juanda",
      city: "Bandung",
      state: "Jawa Barat",
      country: "Indonesia",
      postalCode: "40135",
      lng: 107.64854181651953,
      lat: -6.854812080879967,
    },
    property: {
      name: "Dago Hillside House",
      description:
        "Two-bedroom house on the northern slope with a view over the valley. Cool climate, no air conditioning needed. Small terrace and garden, quiet residential street.",
      price: 5500000,
      rentalPeriod: RentalPeriod.Monthly,
      securityDeposit: 5500000,
      applicationFee: 200000,
      photoUrls: [
        "https://re-s3-images.s3.us-east-1.amazonaws.com/properties/8b4153fd-02fd-42f1-a7a4-54a8243e7f01-dago.jpg",
      ],
      amenities: [
        Amenity.WasherDryer,
        Amenity.Parking,
        Amenity.WiFi,
        Amenity.PetsAllowed,
        Amenity.Refrigerator,
        Amenity.HardwoodFloors,
      ],
      highlights: [
        Highlight.GreatView,
        Highlight.SmokeFree,
        Highlight.QuietNeighborhood,
        Highlight.Heating,
      ],
      isPetsAllowed: true,
      isParkingIncluded: true,
      beds: 2,
      baths: 2,
      areaSqm: 102,
      propertyType: PropertyType.Villa,
      furnishing: null,
      postedDate: new Date("2026-08-26T06:27:29.662Z"),
    },
  },
  {
    location: {
      address: "Jl. Kemanggisan Raya No.95, RT.5/RW.7",
      city: "West Jakarta",
      state: "DKI Jakarta",
      country: "Indonesia",
      postalCode: "11480",
      lng: 106.78528748783987,
      lat: -6.192256399074722,
    },
    property: {
      name: "RedDoorz @ Kemanggisan Raya",
      description:
        "Comfortable budget hotel located in West Jakarta, offering clean rooms, free parking, and convenient access to Central Park Mall and Tanah Abang market area.",
      price: 300000,
      rentalPeriod: RentalPeriod.Daily,
      securityDeposit: 500000,
      applicationFee: 50000,
      photoUrls: [
        "https://re-s3-images.s3.us-east-1.amazonaws.com/properties/e81cfb01-6068-48d7-9d26-672bd0e4df98-rddorz.jpg",
      ],
      amenities: [Amenity.WiFi],
      highlights: [Highlight.SmokeFree, Highlight.SatelliteTV],
      isPetsAllowed: true,
      isParkingIncluded: true,
      beds: 1,
      baths: 1,
      areaSqm: 18,
      propertyType: PropertyType.Rooms,
      furnishing: Furnishing.Semi,
      postedDate: new Date("2026-08-28T04:16:20.860Z"),
    },
  },
];

const report = async () => {
  const [
    properties,
    locations,
    leases,
    applications,
    payments,
    reviews,
    conversations,
    messages,
    notifications,
  ] = await Promise.all([
    prisma.property.findMany({
      select: { id: true, name: true, price: true },
      orderBy: { id: "asc" },
    }),
    prisma.location.count(),
    prisma.lease.count(),
    prisma.application.count(),
    prisma.payment.count(),
    prisma.review.count(),
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.notification.count(),
  ]);

  console.log(`\nProperties currently in this database (${properties.length}):`);
  for (const p of properties) {
    console.log(`  #${p.id}  ${p.name}  —  ${p.price}`);
  }
  console.log("\nRows that would be deleted along with them:");
  console.log(`  Location       ${locations}`);
  console.log(`  Lease          ${leases}`);
  console.log(`  Application    ${applications}`);
  console.log(`  Payment        ${payments}`);
  console.log(`  Review         ${reviews}`);
  console.log(`  Conversation   ${conversations}`);
  console.log(`  Message        ${messages}`);
  console.log(`  Notification   ${notifications}  (all orphaned once the above go)`);
  console.log("\nTenant, Manager and PaymentMethod rows are left alone.");
};

async function main() {
  const url = process.env.DATABASE_URL!;
  console.log(`Target: ${url.replace(/:\/\/[^@]*@/, "://***@").split("?")[0]}`);

  await report();

  if (!process.argv.includes("--confirm")) {
    console.log(
      "\nDry run. Nothing was changed. Re-run with --confirm to apply.\n",
    );
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.payment.deleteMany({});
      await tx.application.deleteMany({});
      await tx.lease.deleteMany({});
      await tx.review.deleteMany({});
      await tx.message.deleteMany({});
      await tx.conversation.deleteMany({});
      await tx.$executeRaw`DELETE FROM "_TenantFavorites"`;
      await tx.$executeRaw`DELETE FROM "_TenantProperties"`;
      await tx.notification.deleteMany({});
      await tx.property.deleteMany({});
      await tx.location.deleteMany({});

      await tx.manager.upsert({
        where: { cognitoId: MANAGER.cognitoId },
        update: {},
        create: MANAGER,
      });

      for (const { location, property } of LISTINGS) {
        const rows = await tx.$queryRaw<{ id: number }[]>`
          INSERT INTO "Location" ("address", "city", "state", "country", "postalCode", "coordinates")
          VALUES (
            ${location.address},
            ${location.city},
            ${location.state},
            ${location.country},
            ${location.postalCode},
            ST_SetSRID(ST_MakePoint(${location.lng}, ${location.lat}), 4326)
          )
          RETURNING "id"
        `;

        const created = await tx.property.create({
          data: {
            ...property,
            locationId: rows[0].id,
            managerCognitoId: MANAGER.cognitoId,
          },
        });
        console.log(`Inserted #${created.id}  ${created.name}`);
      }
    },
    { timeout: 120_000, maxWait: 15_000 },
  );

  console.log("\nDone. Six listings are live.\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });