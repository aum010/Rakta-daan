import "./load-env";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";
import { dispatchQueued } from "../src/lib/messaging/outbox";
import { expireStaleRequests } from "../src/lib/requests";
import { runRetention } from "../src/lib/retention";

/**
 * Worker entrypoint for cron / systemd timers.
 * The HTTP cron endpoint (/api/internal/outbox) does the same thing.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const db = drizzle(client, { schema });
    const dispatch = await dispatchQueued(db, { limit: 50 });
    const expired = await expireStaleRequests(db);
    const retention = await runRetention(db);
    console.log(
      JSON.stringify({ dispatch, expiredRequests: expired, retention }, null, 2),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[outbox] failed", error);
  process.exit(1);
});
