import { and, eq, isNotNull, lt, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { auditEvents, bloodRequests, messages, otpCodes, rateLimits, sessions } from "@/db/schema";

export type RetentionSummary = {
  contactDetailsScrubbed: number;
  messagesDeleted: number;
  auditDeleted: number;
  sessionsDeleted: number;
  otpDeleted: number;
  rateLimitWindowsDeleted: number;
};

/**
 * Enforces the retention commitments published in the privacy notice:
 *  - request contact details are scrubbed 7 days after a request closes
 *  - delivery records are deleted after 12 months
 *  - audit records are deleted after 24 months
 *  - expired sessions, OTP codes and rate-limit windows are purged
 */
export async function runRetention(db: Db, now = new Date()): Promise<RetentionSummary> {
  const scrubBefore = new Date(now.getTime() - 7 * 86_400_000);
  const messagesBefore = new Date(now.getTime() - 365 * 86_400_000);
  const auditBefore = new Date(now.getTime() - 730 * 86_400_000);

  const scrubbed = await db
    .update(bloodRequests)
    .set({ contactPhoneEnc: null, patientReferenceEnc: null, updatedAt: now })
    .where(
      and(
        isNotNull(bloodRequests.contactPhoneEnc),
        sql`${bloodRequests.status} <> 'open'`,
        lt(bloodRequests.closedAt, scrubBefore),
      ),
    )
    .returning({ id: bloodRequests.id });

  const deletedMessages = await db
    .delete(messages)
    .where(lt(messages.createdAt, messagesBefore))
    .returning({ id: messages.id });

  const deletedAudit = await db
    .delete(auditEvents)
    .where(lt(auditEvents.createdAt, auditBefore))
    .returning({ id: auditEvents.id });

  const deletedSessions = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date(now.getTime() - 86_400_000)))
    .returning({ id: sessions.id });

  const deletedOtp = await db
    .delete(otpCodes)
    .where(lt(otpCodes.expiresAt, new Date(now.getTime() - 86_400_000)))
    .returning({ id: otpCodes.id });

  const deletedRateWindows = await db
    .delete(rateLimits)
    .where(lt(rateLimits.windowStart, new Date(now.getTime() - 7 * 86_400_000)))
    .returning({ bucket: rateLimits.bucket });

  return {
    contactDetailsScrubbed: scrubbed.length,
    messagesDeleted: deletedMessages.length,
    auditDeleted: deletedAudit.length,
    sessionsDeleted: deletedSessions.length,
    otpDeleted: deletedOtp.length,
    rateLimitWindowsDeleted: deletedRateWindows.length,
  };
}

/** Used by tests and admin diagnostics. */
export async function closedRequestStillHasContact(db: Db, publicId: string): Promise<boolean> {
  const [row] = await db
    .select({ contactPhoneEnc: bloodRequests.contactPhoneEnc })
    .from(bloodRequests)
    .where(eq(bloodRequests.publicId, publicId))
    .limit(1);
  return Boolean(row?.contactPhoneEnc);
}
