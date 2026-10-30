import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { messages, optOuts } from "@/db/schema";
import { env } from "@/lib/env";
import { blindIndex, safeEqual } from "@/lib/crypto";
import { recordAudit } from "@/lib/audit";

type StatusPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        statuses?: Array<{
          id: string;
          status: "sent" | "delivered" | "read" | "failed" | "deleted";
          errors?: Array<{ code?: number; title?: string; message?: string }>;
        }>;
        messages?: Array<{
          from?: string;
          type?: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
};

const STOP_WORDS = new Set(["stop", "unsubscribe", "रोक्न", "रोक्नुहोस्", "बन्द"]);

/** Meta webhook verification handshake. */
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (!env.whatsapp.verifyToken) {
    return NextResponse.json(
      { error: "webhook_not_configured" },
      { status: 503 },
    );
  }
  if (mode === "subscribe" && token && safeEqual(token, env.whatsapp.verifyToken)) {
    return new NextResponse(challenge ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

/**
 * Delivery status webhook. A signature is mandatory: without WHATSAPP_APP_SECRET
 * we refuse all callbacks rather than trusting unauthenticated input.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const appSecret = env.whatsapp.appSecret;
  if (!appSecret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const expected = `sha256=${createHmac("sha256", appSecret).update(raw).digest("hex")}`;
  if (!signature || !safeEqual(signature, expected)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: StatusPayload;
  try {
    payload = JSON.parse(raw) as StatusPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const db = getDb();
  let statusUpdates = 0;
  let optOutsAdded = 0;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const status of change.value?.statuses ?? []) {
        const mapped =
          status.status === "failed"
            ? "failed"
            : status.status === "sent" ||
                status.status === "delivered" ||
                status.status === "read"
              ? status.status
              : null;
        if (!mapped) continue;

        const error = status.errors?.[0];
        const result = await db
          .update(messages)
          .set({
            status: mapped,
            deliveredAt: mapped === "delivered" ? new Date() : undefined,
            readAt: mapped === "read" ? new Date() : undefined,
            failedAt: mapped === "failed" ? new Date() : undefined,
            errorCode: mapped === "failed" ? String(error?.code ?? "provider_error") : null,
            errorMessage: mapped === "failed" ? (error?.message ?? error?.title ?? null) : null,
            updatedAt: new Date(),
          })
          .where(eq(messages.providerMessageId, status.id))
          .returning({ id: messages.id });
        statusUpdates += result.length;
      }

      for (const inbound of change.value?.messages ?? []) {
        const text = inbound.text?.body?.trim().toLowerCase();
        const from = inbound.from?.replace(/\D/g, "");
        if (!text || !from || !STOP_WORDS.has(text)) continue;
        const e164 = `+${from.startsWith("977") ? from : `977${from}`}`;
        await db
          .insert(optOuts)
          .values({
            phoneHash: blindIndex(e164, "phone"),
            channel: "whatsapp",
            reason: "inbound STOP message",
          })
          .onConflictDoNothing();
        optOutsAdded += 1;
      }
    }
  }

  if (statusUpdates > 0 || optOutsAdded > 0) {
    await recordAudit(db, {
      action: "webhook.whatsapp",
      entityType: "message",
      metadata: { statusUpdates, optOutsAdded },
    });
  }

  return NextResponse.json({ received: true });
}
