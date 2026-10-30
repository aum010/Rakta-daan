import { and, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { donors, messages, optOuts, users } from "@/db/schema";
import { decryptString } from "@/lib/crypto";
import { getAdapter } from "./adapters";
import type { MessagingChannel } from "./types";

export type EnqueueInput = {
  idempotencyKey: string;
  channel: MessagingChannel;
  template: string;
  recipientUserId: string;
  donorId?: string | null;
  requestId?: string | null;
  toPhoneHash: string;
  params: Record<string, string>;
  text: string;
  consentSnapshot: Record<string, unknown>;
};

/** Inserts a message once; duplicate keys are ignored. Returns true if inserted. */
export async function enqueueMessage(db: Db, input: EnqueueInput): Promise<boolean> {
  const inserted = await db
    .insert(messages)
    .values({
      idempotencyKey: input.idempotencyKey,
      channel: input.channel,
      template: input.template,
      recipientUserId: input.recipientUserId,
      donorId: input.donorId ?? null,
      requestId: input.requestId ?? null,
      toPhoneHash: input.toPhoneHash,
      payload: { params: input.params, text: input.text, locale: input.params.locale ?? "en" },
      consentSnapshot: input.consentSnapshot,
    })
    .onConflictDoNothing({ target: messages.idempotencyKey })
    .returning({ id: messages.id });
  return inserted.length > 0;
}

export type DispatchSummary = {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  retried: number;
  simulated: number;
};

/**
 * Sends up to `limit` queued messages. Messages are claimed with
 * FOR UPDATE SKIP LOCKED, so it is safe to run more than one worker.
 * Consent and opt-out state are re-checked immediately before sending.
 */
export async function dispatchQueued(
  db: Db,
  options: { limit?: number; now?: Date } = {},
): Promise<DispatchSummary> {
  const limit = options.limit ?? 25;
  const now = options.now ?? new Date();
  const summary: DispatchSummary = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    retried: 0,
    simulated: 0,
  };

  const claimed = await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(messages)
      .where(and(eq(messages.status, "queued"), lte(messages.scheduledFor, now)))
      .orderBy(messages.createdAt)
      .limit(limit)
      .for("update", { skipLocked: true });
    if (rows.length === 0) return [];
    await tx
      .update(messages)
      .set({
        status: "sending",
        attempts: sql`${messages.attempts} + 1`,
        updatedAt: now,
      })
      .where(
        inArray(
          messages.id,
          rows.map((row) => row.id),
        ),
      );
    return rows.map((row) => ({ ...row, attempts: row.attempts + 1 }));
  });

  for (const message of claimed) {
    summary.processed += 1;
    const finish = async (
      values: Partial<typeof messages.$inferInsert>,
    ): Promise<void> => {
      await db
        .update(messages)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(messages.id, message.id));
    };

    if (!message.recipientUserId) {
      await finish({
        status: "skipped",
        errorCode: "recipient_unavailable",
        errorMessage: "Recipient account no longer exists.",
      });
      summary.skipped += 1;
      continue;
    }

    const [recipient] = await db
      .select({
        phoneEnc: users.phoneEnc,
        status: users.status,
        donorWithdrawnAt: donors.withdrawnAt,
        consentAlerts: donors.consentAlerts,
        consentSms: donors.consentSms,
        consentWhatsapp: donors.consentWhatsapp,
      })
      .from(users)
      .leftJoin(donors, eq(donors.userId, users.id))
      .where(eq(users.id, message.recipientUserId))
      .limit(1);

    if (!recipient || recipient.status !== "active") {
      await finish({
        status: "skipped",
        errorCode: "recipient_unavailable",
        errorMessage: "Recipient account is not active.",
      });
      summary.skipped += 1;
      continue;
    }

    const blockedByOptOut = await db
      .select({ id: optOuts.id })
      .from(optOuts)
      .where(
        and(
          eq(optOuts.phoneHash, message.toPhoneHash),
          or(isNull(optOuts.channel), eq(optOuts.channel, message.channel)),
        ),
      )
      .limit(1);

    const channelConsent =
      message.channel === "whatsapp" ? recipient.consentWhatsapp : recipient.consentSms;

    if (
      blockedByOptOut.length > 0 ||
      recipient.donorWithdrawnAt ||
      recipient.consentAlerts === false ||
      channelConsent === false
    ) {
      await finish({
        status: "skipped",
        errorCode: blockedByOptOut.length > 0 ? "opted_out" : "consent_withdrawn",
        errorMessage: "Recipient consent no longer allows this message.",
      });
      summary.skipped += 1;
      continue;
    }

    let phone: string;
    try {
      phone = decryptString(recipient.phoneEnc, "phone");
    } catch {
      await finish({
        status: "failed",
        errorCode: "decrypt_failed",
        errorMessage: "Stored contact could not be decrypted.",
        failedAt: new Date(),
      });
      summary.failed += 1;
      continue;
    }

    if (message.channel === "in_app") {
      await finish({
        status: "skipped",
        provider: "in_app",
        errorCode: "in_app_only",
        errorMessage: "In-app notifications are not sent through a messaging provider.",
      });
      summary.skipped += 1;
      continue;
    }

    const payload = (message.payload ?? {}) as {
      params?: Record<string, string>;
      text?: string;
      locale?: string;
    };
    const adapter = getAdapter(message.channel);
    const outcome = await adapter.send({
      channel: message.channel,
      to: phone,
      template: message.template,
      locale: payload.locale === "ne" ? "ne" : "en",
      params: payload.params ?? {},
      text: payload.text ?? "",
    });

    if (outcome.status === "sent") {
      await finish({
        status: "sent",
        provider: outcome.provider,
        providerMessageId: outcome.providerMessageId ?? null,
        sentAt: new Date(),
        errorCode: null,
        errorMessage: null,
      });
      summary.sent += 1;
      if (outcome.simulated) summary.simulated += 1;
      continue;
    }

    if (outcome.status === "skipped") {
      await finish({
        status: "skipped",
        provider: outcome.provider,
        errorCode: outcome.errorCode ?? "skipped",
        errorMessage: outcome.errorMessage ?? null,
      });
      summary.skipped += 1;
      continue;
    }

    const shouldRetry = outcome.retryable === true && message.attempts < 3;
    if (shouldRetry) {
      const delayMinutes = Math.pow(2, message.attempts);
      await finish({
        status: "queued",
        provider: outcome.provider,
        errorCode: outcome.errorCode ?? "send_failed",
        errorMessage: outcome.errorMessage ?? null,
        scheduledFor: new Date(Date.now() + delayMinutes * 60_000),
      });
      summary.retried += 1;
      continue;
    }

    await finish({
      status: "failed",
      provider: outcome.provider,
      errorCode: outcome.errorCode ?? "send_failed",
      errorMessage: outcome.errorMessage ?? null,
      failedAt: new Date(),
    });
    summary.failed += 1;
  }

  return summary;
}
