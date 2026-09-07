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

const MANAGER_COGNITO_ID = "14284448-5011-70d6-5864-252dabfdf8bd";

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
    panoramaUrl: string;
    amenities: Amenity[];
    highlights: Highlight[];
    isPetsAllowed: boolean;
    isParkingIncluded: boolean;
    beds: number;
    baths: number;
    areaSqm: number;
    propertyType: PropertyType;
    furnishing: Furnishing;
  };
};

const S3 = "https://re-s3-images.s3.us-east-1.amazonaws.com/properties";

const LISTINGS: Listing[] = [
  {
    location: {
      address: "Jl. Kemang Raya No.7, RT.4/RW.1",
      city: "South Jakarta",
      state: "DKI Jakarta",
      country: "Indonesia",
      postalCode: "12730",
      lng: 106.81520419927443,
      lat: -6.25616680238933,
    },
    property: {
      name: "Arion Suites Hotel Kemang",
      description:
        "Discover premium co-living or extended stays at Arion Suites Hotel Kemang. Enjoy spacious, fully serviced 4-star suites with premium amenities, a gym, and a rooftop pool in Jakarta's trendiest neighborhood.",
      price: 570000,
      rentalPeriod: RentalPeriod.Daily,
      securityDeposit: 250000,
      applicationFee: 57000,
      photoUrls: [`${S3}/e7388cee-6b6a-48e3-9a90-0235e6efb153-arion.webp`],
      panoramaUrl: `${S3}/ae1d5a6a-8fba-423c-90d1-0f0e7dbb7ada-guesthouselivingroom4096x2048.jpg`,
      amenities: [
        Amenity.AirConditioning,
        Amenity.HighSpeedInternet,
        Amenity.WiFi,
        Amenity.Refrigerator,
        Amenity.Pool,
        Amenity.Gym,
        Amenity.Parking,
      ],
      highlights: [
        Highlight.HighSpeedInternetAccess,
        Highlight.AirConditioning,
        Highlight.SatelliteTV,
        Highlight.Intercom,
        Highlight.SprinklerSystem,
        Highlight.SmokeFree,
        Highlight.CloseToTransit,
        Highlight.GreatView,
      ],
      isPetsAllowed: false,
      isParkingIncluded: true,
      beds: 1,
      baths: 1,
      areaSqm: 28,
      propertyType: PropertyType.Rooms,
      furnishing: Furnishing.Full,
    },
  },
  {
    location: {
      address: "Jl. Bintaro Utama 3A No.12 Blok AA",
      city: "South Tangerang",
      state: "Banten",
      country: "Indonesia",
      postalCode: "15225",
      lng: 106.73920329134575,
      lat: -6.269878338963196,
    },
    property: {
      name: "Ruko Victorian Bintaro",
      description:
        "Prime location alert! Own this premium Victorian Bintaro shophouse at Bintaro Utama Sector 3A. Perfect for high-traffic retail, modern offices, or strategic investments. Boost your business today!",
      price: 18750000,
      rentalPeriod: RentalPeriod.Monthly,
      securityDeposit: 18750000,
      applicationFee: 1875000,
      photoUrls: [`${S3}/86681cf6-973c-4d37-be2e-21cfc40e11a5-binbinbin.jpg`],
      panoramaUrl: `${S3}/a65c7f14-627e-49ce-afaa-ea558853b2af-bintaro.jpg`,
      amenities: [Amenity.HighSpeedInternet, Amenity.WiFi, Amenity.Parking],
      highlights: [Highlight.SmokeFree, Highlight.Intercom],
      isPetsAllowed: false,
      isParkingIncluded: true,
      beds: 1,
      baths: 2,
      areaSqm: 135,
      propertyType: PropertyType.Townhouse,
      furnishing: Furnishing.Unfurnished,
    },
  },
  {
    location: {
      address: "Jl. Bukit Pakar Timur",
      city: "Bandung Regency",
      state: "West Java",
      country: "Indonesia",
      postalCode: "40198",
      lng: 107.64776265704552,
      lat: -6.8549276413545215,
    },
    property: {
      name: "The Wiltshire Dago Pakar Hillside Villa",
      description:
        "Hillside villa in the serene Dago Pakar area, sleeping up to 12. Three bedrooms, two bathrooms with walk-in showers, and two living rooms. Fully equipped kitchen with fridge and kitchenware, flat-screen TV, mountain views and garden access.",
      price: 1200000,
      rentalPeriod: RentalPeriod.Daily,
      securityDeposit: 1200000,
      applicationFee: 250000,
      photoUrls: [`${S3}/21f943b5-bc92-4811-a182-01947ba1ab28-vilaldago.avif`],
      panoramaUrl: `${S3}/5d679ddd-9ff1-4ff1-8f8e-9ce6a8af5422-dago.jpg`,
      amenities: [Amenity.Refrigerator, Amenity.WiFi, Amenity.Parking],
      highlights: [Highlight.QuietNeighborhood, Highlight.GreatView],
      isPetsAllowed: false,
      isParkingIncluded: true,
      beds: 3,
      baths: 2,
      areaSqm: 200,
      propertyType: PropertyType.Villa,
      furnishing: Furnishing.Full,
    },
  },
  {
    location: {
      address: "Jl. Pintu Besar Utara No.27, Pinangsia",
      city: "West Jakarta",
      state: "DKI Jakarta",
      country: "Indonesia",
      postalCode: "11110",
      lng: 106.81327819777528,
      lat: -6.135158979491607,
    },
    property: {
      name: "Kota Tua Heritage Loft",
      description:
        "Open-plan loft in a restored colonial-era building in Jakarta's old town. High ceilings, hardwood floors and tall windows across one large living space. Two minutes' walk to Fatahillah Square and Jakarta Kota station, with the Taman Sari cafés and museums on the doorstep.",
      price: 7000000,
      rentalPeriod: RentalPeriod.Monthly,
      securityDeposit: 7000000,
      applicationFee: 250000,
      photoUrls: [`${S3}/457e0666-d62f-4337-b1ef-2225abda9ab7-kottua.jpg`],
      panoramaUrl: `${S3}/bee8ee5c-2c71-43b6-919c-fc62ca1dedc2-kotatuakoontol.jpg`,
      amenities: [
        Amenity.AirConditioning,
        Amenity.HighSpeedInternet,
        Amenity.HardwoodFloors,
        Amenity.WiFi,
      ],
      highlights: [
        Highlight.RecentlyRenovated,
        Highlight.CloseToTransit,
        Highlight.AirConditioning,
        Highlight.HighSpeedInternetAccess,
      ],
      isPetsAllowed: true,
      isParkingIncluded: false,
      beds: 1,
      baths: 1,
      areaSqm: 85,
      propertyType: PropertyType.Apartment,
      furnishing: Furnishing.Semi,
    },
  },
];

async function main() {
  const url = process.env.DATABASE_URL!;
  console.log(`Target: ${url.replace(/:\/\/[^@]*@/, "://***@").split("?")[0]}`);

  const manager = await prisma.manager.findUnique({
    where: { cognitoId: MANAGER_COGNITO_ID },
    select: { cognitoId: true, name: true },
  });
  if (!manager) {
    throw new Error(
      `Manager ${MANAGER_COGNITO_ID} does not exist in this database. ` +
        `Run resetProperties.ts first, or seed the manager by hand.`,
    );
  }
  console.log(`Manager: ${manager.name}`);

  const existing = await prisma.property.findMany({
    where: { name: { in: LISTINGS.map((l) => l.property.name) } },
    select: { id: true, name: true },
  });
  const alreadyThere = new Set(existing.map((p) => p.name));

  console.log("\nPlanned:");
  for (const { property } of LISTINGS) {
    console.log(
      alreadyThere.has(property.name)
        ? `  SKIP    ${property.name}  (already present)`
        : `  INSERT  ${property.name}`,
    );
  }

  const toInsert = LISTINGS.filter((l) => !alreadyThere.has(l.property.name));
  if (toInsert.length === 0) {
    console.log("\nNothing to do.\n");
    return;
  }

  if (!process.argv.includes("--confirm")) {
    console.log("\nDry run. Nothing was changed. Re-run with --confirm.\n");
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      for (const { location, property } of toInsert) {
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
            managerCognitoId: MANAGER_COGNITO_ID,
          },
        });
        console.log(`Inserted #${created.id}  ${created.name}`);
      }
    },
    { timeout: 120_000, maxWait: 15_000 },
  );

  console.log(`\nDone. ${toInsert.length} listing(s) added.\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });