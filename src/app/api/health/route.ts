import type { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { collectConfigWarnings, env } from "@/lib/env";
import { jsonOk } from "@/lib/http";

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  let database: "ok" | "unavailable" = "ok";
  try {
    const db = getDb();
    await db.execute(sql`select 1`);
  } catch {
    database = "unavailable";
  }

  const authorized =
    req.headers.get("authorization") === `Bearer ${env.cronSecret}`;

  return jsonOk(
    {
      status: database === "ok" ? "ok" : "degraded",
      database,
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
      // Warnings reveal configuration posture, so they require the cron secret.
      ...(authorized ? { warnings: collectConfigWarnings() } : {}),
    },
    { status: database === "ok" ? 200 : 503 },
  );
}
