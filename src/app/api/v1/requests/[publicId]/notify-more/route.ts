import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bloodRequests } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { RATE_LIMITS } from "@/lib/constants";
import { consumeRateLimit } from "@/lib/rate-limit";
import { notifyDonorsForRequest } from "@/lib/requests";
import { recordAudit } from "@/lib/audit";
import {
  ApiError,
  assertSameOrigin,
  clientIpHash,
  jsonError,
  jsonOk,
} from "@/lib/http";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ publicId: string }> },
) {
  try {
    assertSameOrigin(req);
    const user = await requireApiUser();
    const { publicId } = await context.params;
    const db = getDb();

    const [request] = await db
      .select()
      .from(bloodRequests)
      .where(eq(bloodRequests.publicId, publicId))
      .limit(1);
    if (!request) throw new ApiError(404, "not_found", "Request not found.");
    if (request.createdByUserId !== user.id && !user.isAdmin) {
      throw new ApiError(403, "forbidden", "You can only manage your own request.");
    }

    const limit = await consumeRateLimit(db, {
      bucket: "notify_more_user",
      key: user.id,
      ...RATE_LIMITS.requestCreatePerUser,
    });
    if (!limit.allowed) {
      throw new ApiError(429, "rate_limited", "Too many notifications requested. Try again later.");
    }

    const notified = await notifyDonorsForRequest(db, request.id, { limit: 25 });
    await recordAudit(db, {
      actorUserId: user.id,
      actorRole: user.isAdmin ? "admin" : "requester",
      action: "request.notify_more",
      entityType: "blood_request",
      entityId: request.id,
      metadata: { notified: notified.notified },
      ipHash: clientIpHash(req),
    });

    return jsonOk({ ok: true, ...notified });
  } catch (error) {
    return jsonError(error);
  }
}
