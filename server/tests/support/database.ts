import "dotenv/config";
import { Client } from "pg";

const developmentUrl = process.env.DATABASE_URL;
if (!developmentUrl) {
  throw new Error("DATABASE_URL is not set — check server/.env");
}

export const TEST_DATABASE_URL = (() => {
  const url = new URL(developmentUrl);
  if (!url.pathname.endsWith("_test")) {
    url.pathname = `${url.pathname}_test`;
  }
  return url.toString();
})();

export const ADMIN_DATABASE_URL = (() => {
  const url = new URL(developmentUrl);
  url.pathname = "/postgres";
  url.search = "";
  return url.toString();
})();

export const TEST_DATABASE_NAME = decodeURIComponent(
  new URL(TEST_DATABASE_URL).pathname.slice(1),
);

process.env.DATABASE_URL = TEST_DATABASE_URL;

export const resetDatabase = async () => {
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT LIKE '\\_prisma%'
        AND tablename <> 'spatial_ref_sys'
    `);
    if (rows.length > 0) {
      const tables = rows.map((row) => `"${row.tablename}"`).join(", ");
      await client.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
    }
  } finally {
    await client.end();
  }
};