import { Prisma } from "@prisma/client";
import { wktToGeoJSON } from "@terraformer/wkt";
import { prisma } from "./prisma";

export type Coordinates = { longitude?: number; latitude?: number };

type WithLocation = { location: { id: number } };

const readWkt = async (locationIds: number[]) => {
  if (locationIds.length === 0) return new Map<number, string>();

  const rows = await prisma.$queryRaw<{ id: number; coordinates: string }[]>`
    SELECT id, ST_AsText(coordinates) AS coordinates
    FROM "Location" WHERE id IN (${Prisma.join(locationIds)})
  `;
  return new Map(rows.map((row) => [row.id, row.coordinates]));
};

const parsePoint = (wkt: string | undefined): Coordinates => {
  if (!wkt) return {};
  const geoJSON = wktToGeoJSON(wkt) as { coordinates?: number[] } | null;
  return {
    longitude: geoJSON?.coordinates?.[0],
    latitude: geoJSON?.coordinates?.[1],
  };
};

export const withCoordinates = async <T extends WithLocation>(
  properties: T[],
) => {
  const wktById = await readWkt(properties.map((p) => p.location.id));

  return properties.map((property) => ({
    ...property,
    location: {
      ...property.location,
      coordinates: parsePoint(wktById.get(property.location.id)),
    },
  }));
};

/** The single-property form of {@link withCoordinates}. */
export const withCoordinatesOne = async <T extends WithLocation>(
  property: T,
) => {
  const [withPoint] = await withCoordinates([property]);
  return withPoint;
};