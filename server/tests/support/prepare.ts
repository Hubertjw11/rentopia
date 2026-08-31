import { execSync } from "node:child_process";
import { Client } from "pg";
import {
  ADMIN_DATABASE_URL,
  TEST_DATABASE_NAME,
  TEST_DATABASE_URL,
} from "./database";
    
const main = async () => {
  const admin = new Client({ connectionString: ADMIN_DATABASE_URL });
  await admin.connect();
  try { 
    await admin.query(
      `DROP DATABASE IF EXISTS "${TEST_DATABASE_NAME}" WITH (FORCE)`,
    );
    await admin.query(`CREATE DATABASE "${TEST_DATABASE_NAME}"`);
  } finally {
    await admin.end();
  }
  
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });

  console.log(`\n${TEST_DATABASE_NAME} rebuilt and migrated.\n`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
})  