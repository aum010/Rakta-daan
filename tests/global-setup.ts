import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

export default async function globalSetup() {
  config({ path: [".env.local", ".env"], quiet: true });

  const testUrl =
    process.env.TEST_DATABASE_URL ??
    "postgres://rakta:rakta@127.0.0.1:5435/rakta_daan_test";
  const parsed = new URL(testUrl);
  const databaseName = parsed.pathname.replace(/^\//, "");
  if (!/^[a-z0-9_]+$/i.test(databaseName)) {
    throw new Error("Unsafe test database name");
  }

  const adminUrl = new URL(testUrl);
  adminUrl.pathname = "/postgres";
  const admin = postgres(adminUrl.toString(), { max: 1, onnotice: () => {} });
  try {
    const existing = await admin`
      select 1 from pg_database where datname = ${databaseName}
    `;
    if (existing.length === 0) {
      await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
      console.log(`[test] created database ${databaseName}`);
    }
  } finally {
    await admin.end();
  }

  const client = postgres(testUrl, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    console.log(`[test] migrations applied to ${databaseName}`);
  } finally {
    await client.end();
  }
}
