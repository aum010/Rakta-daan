import "./load-env";
import postgres from "postgres";

/**
 * Development helper: destroys ALL data in the target database schema.
 * Refuses to run when NODE_ENV=production.
 */
async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to reset the database with NODE_ENV=production.");
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    console.log("[reset] dropping schema public");
    await client.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await client.unsafe("CREATE SCHEMA public");
    console.log("[reset] done. Run `pnpm db:migrate` next.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[reset] failed", error);
  process.exit(1);
});
