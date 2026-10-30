import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { abuseReports, bloodRequests } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { RATE_LIMITS } from "@/lib/constants";
import { encryptString } from "@/lib/crypto";
import { consumeRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import {
  ApiError,
  assertSameOrigin,
  clientIpHash,
  jsonError,
  jsonOk,
  parseJson,
} from "@/lib/http";
import { abuseReportSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const body = await parseJson(req, abuseReportSchema);
    const db = getDb();
    const ipHash = clientIpHash(req);
    const user = await getSessionUser();

    if (!user && !body.details && !body.contact) {
      throw new ApiError(
        422,
        "details_required",
        "Add a short description or a contact so we can follow up.",
      );
    }

    if (ipHash) {
      const limit = await consumeRateLimit(db, {
        bucket: "abuse_ip",
        key: ipHash,
        ...RATE_LIMITS.abuseReportPerIp,
      });
      if (!limit.allowed) {
        throw new ApiError(429, "rate_limited", "Too many reports. Try again later.");
      }
    }

    let requestId: string | null = null;
    if (body.requestPublicId) {
      const [request] = await db
        .select({ id: bloodRequests.id })
        .from(bloodRequests)
        .where(eq(bloodRequests.publicId, body.requestPublicId))
        .limit(1);
      requestId = request?.id ?? null;
    }

    const [created] = await db
      .insert(abuseReports)
      .values({
        requestId,
        reporterUserId: user?.id ?? null,
        reason: body.reason,
        details: body.details ?? null,
        contactEnc: body.contact ? encryptString(body.contact, "abuse-contact") : null,
      })
      .returning({ id: abuseReports.id });

    await recordAudit(db, {
      actorUserId: user?.id ?? null,
      actorRole: user ? "user" : "anonymous",
      action: "abuse.reported",
      entityType: "abuse_report",
      entityId: created?.id,
      metadata: { reason: body.reason, hasRequest: Boolean(requestId) },
      ipHash,
    });

    return jsonOk({ ok: true }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
