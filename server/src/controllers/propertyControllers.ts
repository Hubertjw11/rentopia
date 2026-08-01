import { Request, Response } from "express";
import {
  Prisma,
  Location,
  Amenity,
  Highlight,
  PropertyType,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { wktToGeoJSON } from "@terraformer/wkt";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import axios from "axios";
import { parseId, parseNumber } from "../lib/params";

const DEFAULT_PROPERTY_LIMIT = 12;
const MAX_PROPERTY_LIMIT = 50;
const MAX_MAP_MARKERS = 1000;

const propertySource = Prisma.sql`
  FROM "Property" p
  JOIN "Location" l ON p."locationId" = l.id
`;

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

const buildPropertyWhere = (query: Request["query"]): Prisma.Sql => {
  const {
    favoriteIds,
    priceMin,
    priceMax,
    beds,
    baths,
    propertyType,
    squareFeetMin,
    squareFeetMax,
    amenities,
    availableFrom,
    latitude,
    longitude,
  } = query;

  const whereConditions: Prisma.Sql[] = [];

  if (favoriteIds) {
    const favoriteIdsArray = (favoriteIds as string)
      .split(",")
      .map((v) => parseNumber(v))
      .filter((v): v is number => v !== null);
    if (favoriteIdsArray.length) {
      whereConditions.push(
        Prisma.sql`p.id IN (${Prisma.join(favoriteIdsArray)})`,
      );
    }
  }

  const priceMinNum = parseNumber(priceMin);
  if (priceMinNum !== null) {
    whereConditions.push(Prisma.sql`p."pricePerMonth" >= ${priceMinNum}`);
  }

  const priceMaxNum = parseNumber(priceMax);
  if (priceMaxNum !== null) {
    whereConditions.push(Prisma.sql`p."pricePerMonth" <= ${priceMaxNum}`);
  }

  const bedsNum = beds !== "any" ? parseNumber(beds) : null;
  if (bedsNum !== null) {
    whereConditions.push(Prisma.sql`p.beds >= ${bedsNum}`);
  }

  const bathsNum = baths !== "any" ? parseNumber(baths) : null;
  if (bathsNum !== null) {
    whereConditions.push(Prisma.sql`p.baths >= ${bathsNum}`);
  }

  const squareFeetMinNum = parseNumber(squareFeetMin);
  if (squareFeetMinNum !== null) {
    whereConditions.push(Prisma.sql`p."squareFeet" >= ${squareFeetMinNum}`);
  }

  const squareFeetMaxNum = parseNumber(squareFeetMax);
  if (squareFeetMaxNum !== null) {
    whereConditions.push(Prisma.sql`p."squareFeet" <= ${squareFeetMaxNum}`);
  }

  if (propertyType && propertyType !== "any") {
    whereConditions.push(
      Prisma.sql`p."propertyType" = ${propertyType}::"PropertyType"`,
    );
  }

  if (amenities && amenities !== "any") {
    const amenitiesArray = (amenities as string).split(",");
    whereConditions.push(
      Prisma.sql`p.amenities @> ${amenitiesArray}::"Amenity"[]`,
    );
  }

  if (availableFrom && availableFrom !== "any") {
    const availableFromDate =
      typeof availableFrom === "string" ? availableFrom : null;
    if (availableFromDate) {
      const date = new Date(availableFromDate);
      if (!isNaN(date.getTime())) {
        whereConditions.push(
          Prisma.sql`NOT EXISTS (
            SELECT 1 FROM "Lease" lease
            WHERE lease."propertyId" = p.id
            AND lease."endDate" > ${date.toISOString()}::timestamp
          )`,
        );
      }
    }
  }

  const lat = parseNumber(latitude);
  const lng = parseNumber(longitude);
  if (lat !== null && lng !== null) {
    const radiusInKilometers = 1000;
    const degrees = radiusInKilometers / 111; // Converts kilometers to degrees

    whereConditions.push(
      Prisma.sql`ST_DWithin(
        l.coordinates::geometry,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
        ${degrees}
      )`,
    );
  }

  return whereConditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(whereConditions, " AND ")}`
    : Prisma.empty;
};

export const getProperties = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const whereClause = buildPropertyWhere(req.query);

    const requestedLimit = parseNumber(req.query.limit);
    const limit =
      requestedLimit === null || requestedLimit <= 0
        ? DEFAULT_PROPERTY_LIMIT
        : Math.min(Math.floor(requestedLimit), MAX_PROPERTY_LIMIT);

    const requestedPage = parseNumber(req.query.page);
    const page =
      requestedPage === null || requestedPage < 1 ? 1 : Math.floor(requestedPage);
    const offset = (page - 1) * limit;

    const totals = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      ${propertySource}
      ${whereClause}
    `;
    const total = totals[0]?.count ?? 0;

    const properties = await prisma.$queryRaw`
      SELECT 
        p.*,
        json_build_object(
          'id', l.id,
          'address', l.address,
          'city', l.city,
          'state', l.state,
          'country', l.country,
          'postalCode', l."postalCode",
          'coordinates', json_build_object(
            'longitude', ST_X(l."coordinates"::geometry),
            'latitude', ST_Y(l."coordinates"::geometry)
          )
        ) as location
      ${propertySource}
      ${whereClause}
      ORDER BY p."postedDate" DESC, p.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    res.json({ properties, total, page, limit });
  } catch (error) {
    console.error("Error retrieving properties:", error);
    res.status(500).json({ message: "Error retrieving properties" });
  }
};

export const getPropertyMarkers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const whereClause = buildPropertyWhere(req.query);

    const markers = await prisma.$queryRaw`
      SELECT
        p.id,
        p.name,
        p."pricePerMonth",
        ST_X(l."coordinates"::geometry) AS longitude,
        ST_Y(l."coordinates"::geometry) AS latitude
      ${propertySource}
      ${whereClause}
      ORDER BY p.id
      LIMIT ${MAX_MAP_MARKERS}
    `;

    res.json(markers);
  } catch (error) {
    console.error("Error retrieving property markers:", error);
    res.status(500).json({ message: "Error retrieving property markers" });
  }
};

export const getProperty = async (
  req: Request,
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
      include: {
        location: true,
        manager: true,
      },
    });

    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    {
      const coordinates: { coordinates: string }[] =
        await prisma.$queryRaw`SELECT ST_asText(coordinates) as coordinates from "Location" where id = ${property.location.id}`;

      const geoJSON: any = wktToGeoJSON(coordinates[0]?.coordinates || "");
      const longitude = geoJSON.coordinates[0];
      const latitude = geoJSON.coordinates[1];

      const propertyWithCoordinates = {
        ...property,
        location: {
          ...property.location,
          coordinates: {
            longitude,
            latitude,
          },
        },
      };
      res.json(propertyWithCoordinates);
    }
  } catch (error) {
    console.error("Error retrieving property:", error);
    res.status(500).json({ message: "Error retrieving property" });
  }
};

export const createProperty = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      res.status(400).json({ message: "At least one photo is required" });
      return;
    }

    const text = (value: unknown): string | null =>
      typeof value === "string" && value.trim() ? value.trim() : null;

    const address = text(req.body.address);
    const city = text(req.body.city);
    const state = text(req.body.state);
    const country = text(req.body.country);
    const postalCode = text(req.body.postalCode);
    const name = text(req.body.name);
    const description = text(req.body.description);
    const propertyType = text(req.body.propertyType);

    if (
      !address ||
      !city ||
      !state ||
      !country ||
      !postalCode ||
      !name ||
      !description ||
      !propertyType
    ) {
      res.status(400).json({ message: "Some required fields are missing" });
      return;
    }

    const parseEnumList = <T extends string>(
      raw: unknown,
      allowed: readonly T[],
    ): T[] | null => {
      if (typeof raw !== "string" || !raw.trim()) return [];
      const values = raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      return values.every((value) =>
        (allowed as readonly string[]).includes(value),
      )
        ? (values as T[])
        : null;
    };

    const amenities = parseEnumList(req.body.amenities, Object.values(Amenity));
    const highlights = parseEnumList(
      req.body.highlights,
      Object.values(Highlight),
    );
    if (amenities === null || highlights === null) {
      res.status(400).json({ message: "Unknown amenity or highlight" });
      return;
    }
    if (!(Object.values(PropertyType) as string[]).includes(propertyType)) {
      res.status(400).json({ message: "Unknown property type" });
      return;
    }

    const pricePerMonth = parseNumber(req.body.pricePerMonth);
    const securityDeposit = parseNumber(req.body.securityDeposit);
    const applicationFee = parseNumber(req.body.applicationFee);
    const beds = parseNumber(req.body.beds);
    const baths = parseNumber(req.body.baths);
    const squareFeet = parseNumber(req.body.squareFeet);

    const positive = (n: number | null) => n !== null && n > 0;
    if (
      !positive(pricePerMonth) ||
      !positive(securityDeposit) ||
      !positive(applicationFee) ||
      !positive(beds) ||
      !positive(baths) ||
      !positive(squareFeet) ||
      !Number.isInteger(beds) ||
      !Number.isInteger(squareFeet)
    ) {
      res.status(400).json({ message: "Invalid price, size or room count" });
      return;
    }

    const uploads = await Promise.all(
      files.map(async (file) => {
        const result = await new Upload({
          client: s3Client,
          params: {
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: `properties/${randomUUID()}-${file.originalname}`,
            Body: file.buffer,
            ContentType: file.mimetype,
          },
        }).done();

        return result.Location;
      }),
    );

    if (uploads.some((url) => !url)) {
      res.status(502).json({ message: "A photo failed to upload" });
      return;
    }
    const photoUrls = uploads as string[];

    const geocodingUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams(
      {
        street: address,
        city,
        country,
        postalcode: postalCode,
        format: "json",
        limit: "1",
      },
    ).toString()}`;

    let geocodingResponse;
    try {
      geocodingResponse = await axios.get(geocodingUrl, {
        headers: { "User-Agent": "Rentopia (hubertjw05@gmail.com)" },
        timeout: 8000,
      });
    } catch (geocodingError) {
      console.error("Geocoding request failed:", geocodingError);
      res
        .status(503)
        .json({ message: "Address lookup is unavailable, try again shortly" });
      return;
    }

    const match = geocodingResponse.data?.[0];
    if (!match?.lon || !match?.lat) {
      res
        .status(400)
        .json({ message: "That address could not be located, check it again" });
      return;
    }
    const longitude = parseFloat(match.lon);
    const latitude = parseFloat(match.lat);

    const newProperty = await prisma.$transaction(async (tx) => {
      const [location] = await tx.$queryRaw<Location[]>`
        INSERT INTO "Location" (address, city, state, country, "postalCode", coordinates)
        VALUES (${address}, ${city}, ${state}, ${country}, ${postalCode}, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326))
        RETURNING id, address, city, state, country, "postalCode", ST_AsText(coordinates) as coordinates;
      `;

      return tx.property.create({
        data: {
          name,
          description,
          propertyType: propertyType as PropertyType,
          photoUrls,
          locationId: location.id,
          managerCognitoId: req.user!.id,
          amenities,
          highlights,
          isPetsAllowed: req.body.isPetsAllowed === "true",
          isParkingIncluded: req.body.isParkingIncluded === "true",
          pricePerMonth: pricePerMonth!,
          securityDeposit: securityDeposit!,
          applicationFee: applicationFee!,
          beds: beds!,
          baths: baths!,
          squareFeet: squareFeet!,
        },
        include: { location: true, manager: true },
      });
    });

    res.status(201).json(newProperty);
  } catch (error) {
    console.error("createProperty failed:", error);
    res.status(500).json({ message: "Error creating property" });
  }
};
