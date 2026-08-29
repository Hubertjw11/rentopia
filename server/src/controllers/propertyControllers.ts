import { Request, Response } from "express";
import {
  Prisma,
  Location,
  Amenity,
  Furnishing,
  Highlight,
  PropertyType,
  RentalPeriod,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import { uploadFile } from "../lib/s3";
import { withCoordinatesOne } from "../lib/coordinates";
import axios from "axios";
import { parseId, parseNumber } from "../lib/params";
import { MONTHLY_FACTOR } from "../lib/rentalPeriod";

const DEFAULT_PROPERTY_LIMIT = 12;
const MAX_PROPERTY_LIMIT = 50;
const MAX_MAP_MARKERS = 1000;

const monthlyPrice = Prisma.sql`(p.price * CASE p."rentalPeriod"
  WHEN 'Daily' THEN ${MONTHLY_FACTOR.Daily}::numeric
  WHEN 'Weekly' THEN ${MONTHLY_FACTOR.Weekly}::numeric
  WHEN 'Yearly' THEN ${MONTHLY_FACTOR.Yearly}::numeric
  ELSE 1 END)`;

const propertySource = Prisma.sql`
  FROM "Property" p
  JOIN "Location" l ON p."locationId" = l.id
`;

const MAPBOX_GEOCODE_URL = "https://api.mapbox.com/search/geocode/v6/forward";

type GeocodeHit = { longitude: number; latitude: number; accuracy?: string };

const ADDRESS_LEVEL = ["rooftop", "parcel", "point", "interpolated"];

const geocodeAddress = async (
  params: Record<string, string>,
  requireAddressLevel: boolean,
): Promise<GeocodeHit | null> => {
  const response = await axios.get(MAPBOX_GEOCODE_URL, {
    params: {
      ...params,
      access_token: process.env.MAPBOX_ACCESS_TOKEN,
      limit: "1",
      autocomplete: "false",
    },
    timeout: 8000,
  });

  const feature = response.data?.features?.[0];
  const coordinates = feature?.properties?.coordinates;
  if (
    typeof coordinates?.longitude !== "number" ||
    typeof coordinates?.latitude !== "number"
  ) {
    return null;
  }

  if (requireAddressLevel && !ADDRESS_LEVEL.includes(coordinates.accuracy)) {
    console.warn(
      `Geocoder gave ${feature.properties?.feature_type}/${coordinates.accuracy} for "${feature.properties?.full_address ?? ""}" — retrying`,
    );
    return null;
  }

  return {
    longitude: coordinates.longitude,
    latitude: coordinates.latitude,
    accuracy: coordinates.accuracy,
  };
};

const buildPropertyWhere = (query: Request["query"]): Prisma.Sql => {
  const {
    favoriteIds,
    priceMin,
    priceMax,
    beds,
    baths,
    propertyType,
    areaSqmMin,
    areaSqmMax,
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
    whereConditions.push(Prisma.sql`${monthlyPrice} >= ${priceMinNum}`);
  }

  const priceMaxNum = parseNumber(priceMax);
  if (priceMaxNum !== null) {
    whereConditions.push(Prisma.sql`${monthlyPrice} <= ${priceMaxNum}`);
  }

  const bedsNum = beds !== "any" ? parseNumber(beds) : null;
  if (bedsNum !== null) {
    whereConditions.push(Prisma.sql`p.beds >= ${bedsNum}`);
  }

  const bathsNum = baths !== "any" ? parseNumber(baths) : null;
  if (bathsNum !== null) {
    whereConditions.push(Prisma.sql`p.baths >= ${bathsNum}`);
  }

  const areaSqmMinNum = parseNumber(areaSqmMin);
  if (areaSqmMinNum !== null) {
    whereConditions.push(Prisma.sql`p."areaSqm" >= ${areaSqmMinNum}`);
  }

  const areaSqmMaxNum = parseNumber(areaSqmMax);
  if (areaSqmMaxNum !== null) {
    whereConditions.push(Prisma.sql`p."areaSqm" <= ${areaSqmMaxNum}`);
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
      requestedPage === null || requestedPage < 1
        ? 1
        : Math.floor(requestedPage);
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
        p.price,
        p."rentalPeriod",
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

    res.json(await withCoordinatesOne(property));
  } catch (error) {
    console.error("Error retrieving property:", error);
    res.status(500).json({ message: "Error retrieving property" });
  }
};

type PropertyInput = {
  name: string;
  description: string;
  propertyType: PropertyType;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  amenities: Amenity[];
  highlights: Highlight[];
  price: number;
  rentalPeriod: RentalPeriod;
  securityDeposit: number;
  applicationFee: number;
  beds: number;
  baths: number;
  areaSqm: number;
  furnishing: Furnishing | null;
  isPetsAllowed: boolean;
  isParkingIncluded: boolean;
  pin: { longitude: number; latitude: number } | null;
};

const parsePropertyBody = (
  body: Request["body"],
): { ok: true; value: PropertyInput } | { ok: false; message: string } => {
  const text = (value: unknown): string | null =>
    typeof value === "string" && value.trim() ? value.trim() : null;

  const address = text(body.address);
  const city = text(body.city);
  const state = text(body.state);
  const country = text(body.country);
  const postalCode = text(body.postalCode);
  const name = text(body.name);
  const description = text(body.description);
  const propertyType = text(body.propertyType);

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
    return { ok: false, message: "Some required fields are missing" };
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

  const amenities = parseEnumList(body.amenities, Object.values(Amenity));
  const highlights = parseEnumList(body.highlights, Object.values(Highlight));
  if (amenities === null || highlights === null) {
    return { ok: false, message: "Unknown amenity or highlight" };
  }
  if (!(Object.values(PropertyType) as string[]).includes(propertyType)) {
    return { ok: false, message: "Unknown property type" };
  }

  const rentalPeriod = text(body.rentalPeriod);
  if (
    rentalPeriod === null ||
    !(Object.values(RentalPeriod) as string[]).includes(rentalPeriod)
  ) {
    return { ok: false, message: "Unknown rental period" };
  }

  const furnishing = text(body.furnishing);
  if (
    furnishing !== null &&
    !(Object.values(Furnishing) as string[]).includes(furnishing)
  ) {
    return { ok: false, message: "Unknown furnishing" };
  }

  const price = parseNumber(body.price);
  const securityDeposit = parseNumber(body.securityDeposit);
  const applicationFee = parseNumber(body.applicationFee);
  const beds = parseNumber(body.beds);
  const baths = parseNumber(body.baths);
  const areaSqm = parseNumber(body.areaSqm);

  const positive = (n: number | null) => n !== null && n > 0;
  if (
    !positive(price) ||
    !positive(securityDeposit) ||
    !positive(applicationFee) ||
    !positive(beds) ||
    !positive(baths) ||
    !positive(areaSqm) ||
    !Number.isInteger(beds) ||
    !Number.isInteger(areaSqm)
  ) {
    return { ok: false, message: "Invalid price, size or room count" };
  }

  const pinnedLat = parseNumber(body.latitude);
  const pinnedLng = parseNumber(body.longitude);
  const hasPin =
    pinnedLat !== null &&
    pinnedLng !== null &&
    pinnedLat >= -90 &&
    pinnedLat <= 90 &&
    pinnedLng >= -180 &&
    pinnedLng <= 180;

  return {
    ok: true,
    value: {
      name,
      description,
      propertyType: propertyType as PropertyType,
      address,
      city,
      state,
      country,
      postalCode,
      amenities,
      highlights,
      price: price!,
      rentalPeriod: rentalPeriod as RentalPeriod,
      securityDeposit: securityDeposit!,
      applicationFee: applicationFee!,
      beds: beds!,
      baths: baths!,
      areaSqm: areaSqm!,
      furnishing: furnishing as Furnishing | null,
      isPetsAllowed: body.isPetsAllowed === "true",
      isParkingIncluded: body.isParkingIncluded === "true",
      pin: hasPin ? { longitude: pinnedLng!, latitude: pinnedLat! } : null,
    },
  };
};

const resolveCoordinates = async (
  input: PropertyInput,
): Promise<
  | { ok: true; longitude: number; latitude: number }
  | { ok: false; status: number; message: string }
> => {
  if (input.pin) {
    return {
      ok: true,
      longitude: input.pin.longitude,
      latitude: input.pin.latitude,
    };
  }

  if (!process.env.MAPBOX_ACCESS_TOKEN) {
    console.error("MAPBOX_ACCESS_TOKEN is not set — add it to server/.env");
    return {
      ok: false,
      status: 503,
      message: "Address lookup is unavailable, try again shortly",
    };
  }

  const { address, city, state, country, postalCode } = input;
  const freeForm = [address, city, state, country].join(", ");
  const attempts: Array<[Record<string, string>, boolean]> = [
    [
      {
        address_line1: address,
        place: city,
        region: state,
        postcode: postalCode,
        country,
        types: "address",
      },
      true,
    ],
    [{ q: freeForm, types: "address" }, true],
    [{ q: freeForm }, false],
  ];

  let match: GeocodeHit | null = null;
  try {
    for (const [params, requireAddressLevel] of attempts) {
      match = await geocodeAddress(params, requireAddressLevel);
      if (match) break;
    }
  } catch (geocodingError) {
    console.error("Geocoding request failed:", geocodingError);
    return {
      ok: false,
      status: 503,
      message: "Address lookup is unavailable, try again shortly",
    };
  }

  if (!match) {
    return {
      ok: false,
      status: 400,
      message: "That address could not be located, check it again",
    };
  }

  if (
    match.accuracy &&
    !["rooftop", "parcel", "point"].includes(match.accuracy)
  ) {
    console.warn(`Geocoded "${address}" at ${match.accuracy} accuracy`);
  }

  return { ok: true, longitude: match.longitude, latitude: match.latitude };
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

    const parsed = parsePropertyBody(req.body);
    if (!parsed.ok) {
      res.status(400).json({ message: parsed.message });
      return;
    }
    const input = parsed.value;

    const coordinates = await resolveCoordinates(input);
    if (!coordinates.ok) {
      res.status(coordinates.status).json({ message: coordinates.message });
      return;
    }

    const photoUrls = await Promise.all(
      files.map((file) => uploadFile(file, "properties")),
    );

    const newProperty = await prisma.$transaction(async (tx) => {
      const [location] = await tx.$queryRaw<Location[]>`
        INSERT INTO "Location" (address, city, state, country, "postalCode", coordinates)
        VALUES (${input.address}, ${input.city}, ${input.state}, ${input.country}, ${input.postalCode}, ST_SetSRID(ST_MakePoint(${coordinates.longitude}, ${coordinates.latitude}), 4326))
        RETURNING id, address, city, state, country, "postalCode", ST_AsText(coordinates) as coordinates;
      `;

      return tx.property.create({
        data: {
          name: input.name,
          description: input.description,
          propertyType: input.propertyType,
          photoUrls,
          locationId: location.id,
          managerCognitoId: req.user!.id,
          amenities: input.amenities,
          highlights: input.highlights,
          isPetsAllowed: input.isPetsAllowed,
          isParkingIncluded: input.isParkingIncluded,
          price: input.price,
          rentalPeriod: input.rentalPeriod,
          securityDeposit: input.securityDeposit,
          applicationFee: input.applicationFee,
          beds: input.beds,
          baths: input.baths,
          areaSqm: input.areaSqm,
          furnishing: input.furnishing,
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

export const updateProperty = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const propertyId = parseId(req.params.id);
    if (propertyId === null) {
      res.status(400).json({ message: "Invalid property id" });
      return;
    }

    const existing = await prisma.property.findFirst({
      where: { id: propertyId, managerCognitoId: req.user!.id },
      select: { id: true, locationId: true, photoUrls: true },
    });
    if (!existing) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    const parsed = parsePropertyBody(req.body);
    if (!parsed.ok) {
      res.status(400).json({ message: parsed.message });
      return;
    }
    const input = parsed.value;

    const rawKept = req.body.keptPhotoUrls;
    let kept: string[];
    try {
      const list =
        typeof rawKept === "string" && rawKept.trim() ? JSON.parse(rawKept) : [];
      if (
        !Array.isArray(list) ||
        list.some((url: unknown) => typeof url !== "string")
      ) {
        throw new Error("keptPhotoUrls is not a string array");
      }
      kept = list as string[];
    } catch {
      res.status(400).json({ message: "Invalid photo selection" });
      return;
    }

    if (kept.some((url) => !existing.photoUrls.includes(url))) {
      res.status(400).json({ message: "Invalid photo selection" });
      return;
    }

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (kept.length === 0 && files.length === 0) {
      res.status(400).json({ message: "At least one photo is required" });
      return;
    }

    const coordinates = await resolveCoordinates(input);
    if (!coordinates.ok) {
      res.status(coordinates.status).json({ message: coordinates.message });
      return;
    }

    const uploaded = await Promise.all(
      files.map((file) => uploadFile(file, "properties")),
    );

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "Location"
        SET address = ${input.address},
            city = ${input.city},
            state = ${input.state},
            country = ${input.country},
            "postalCode" = ${input.postalCode},
            coordinates = ST_SetSRID(ST_MakePoint(${coordinates.longitude}, ${coordinates.latitude}), 4326)
        WHERE id = ${existing.locationId};
      `;

      return tx.property.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          description: input.description,
          propertyType: input.propertyType,
          photoUrls: [...kept, ...uploaded],
          amenities: input.amenities,
          highlights: input.highlights,
          isPetsAllowed: input.isPetsAllowed,
          isParkingIncluded: input.isParkingIncluded,
          price: input.price,
          rentalPeriod: input.rentalPeriod,
          securityDeposit: input.securityDeposit,
          applicationFee: input.applicationFee,
          beds: input.beds,
          baths: input.baths,
          areaSqm: input.areaSqm,
          furnishing: input.furnishing,
        },
        include: { location: true, manager: true },
      });
    });

    res.json(updated);
  } catch (error) {
    console.error("updateProperty failed:", error);
    res.status(500).json({ message: "Error updating property" });
  }
};