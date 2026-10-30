import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { dispatchQueued } from "@/lib/messaging/outbox";
import { expireStaleRequests } from "@/lib/requests";
import { runRetention } from "@/lib/retention";
import { jsonError, jsonOk, requireBearerSecret } from "@/lib/http";
import { env } from "@/lib/env";
import { outboxRunSchema } from "@/lib/validation";

/**
 * Intended to be called by a scheduler every minute:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://.../api/internal/outbox
 */
export async function POST(req: NextRequest) {
  try {
    requireBearerSecret(req, env.cronSecret);
    const db = getDb();

    let limit = 25;
    const raw = await req.text();
    if (raw) {
      try {
        limit = outboxRunSchema.parse(JSON.parse(raw)).limit;
      } catch {
        limit = 25;
      }
    }

    const dispatch = await dispatchQueued(db, { limit });
    const expired = await expireStaleRequests(db);
    // Retention runs hourly in production; it is idempotent.
    const retention = await runRetention(db);

    return jsonOk({ ok: true, dispatch, expiredRequests: expired, retention });
  } catch (error) {
    return jsonError(error);
  }
}
