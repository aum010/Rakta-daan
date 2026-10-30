import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { optOuts } from "@/db/schema";
import { env } from "@/lib/env";
import { blindIndex } from "@/lib/crypto";
import { normalizePhone } from "@/lib/phone";
import { recordAudit } from "@/lib/audit";
import {
  ApiError,
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseJson,
  requireBearerSecret,
} from "@/lib/http";

const schema = z.object({
  phone: z.string().min(6).max(24),
  action: z.enum(["stop", "start"]),
  reason: z.string().max(200).optional(),
});

/**
 * Used by the SMS gateway to relay STOP/START replies. Requires the shared
 * WEBHOOK_SECRET bearer token.
 */
export async function POST(req: NextRequest) {
  try {
    requireBearerSecret(req, env.webhookSecret);
    assertSameOrigin(req);
    const body = await parseJson(req, schema);
    const phone = normalizePhone(body.phone);
    if (!phone.ok) throw new ApiError(422, "invalid_phone", "Invalid phone number.");

    const db = getDb();
    const phoneHash = blindIndex(phone.e164, "phone");

    if (body.action === "stop") {
      await db
        .insert(optOuts)
        .values({
          phoneHash,
          channel: "sms",
          reason: body.reason ?? "SMS STOP reply",
        })
        .onConflictDoNothing();
    } else {
      await db
        .delete(optOuts)
        .where(and(eq(optOuts.phoneHash, phoneHash), eq(optOuts.channel, "sms")));
    }

    await recordAudit(db, {
      action: body.action === "stop" ? "optout.sms" : "optin.sms",
      entityType: "phone",
      metadata: { channel: "sms" },
    });

    return jsonOk({ ok: true, action: body.action });
  } catch (error) {
    return jsonError(error);
  }
}

/** Health probe used by some gateways. */
export async function GET() {
  const db = getDb();
  const [row] = await db
    .select({ id: optOuts.id })
    .from(optOuts)
    .where(isNull(optOuts.channel))
    .limit(1);
  return jsonOk({ ok: true, globalOptOutsPresent: Boolean(row) });
}
