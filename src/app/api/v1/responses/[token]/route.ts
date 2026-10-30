import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bloodRequests, requestResponses } from "@/db/schema";
import { RATE_LIMITS } from "@/lib/constants";
import { consumeRateLimit } from "@/lib/rate-limit";
import { submitResponse } from "@/lib/requests";
import {
  ApiError,
  assertSameOrigin,
  clientIpHash,
  jsonError,
  jsonOk,
  parseJson,
} from "@/lib/http";
import { responseActionSchema } from "@/lib/validation";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    assertSameOrigin(req);
    const { token } = await context.params;
    const body = await parseJson(req, responseActionSchema);
    const db = getDb();
    const ipHash = clientIpHash(req);

    if (ipHash) {
      const limit = await consumeRateLimit(db, {
        bucket: "response_token_ip",
        key: ipHash,
        ...RATE_LIMITS.responsePerUser,
      });
      if (!limit.allowed) {
        throw new ApiError(429, "rate_limited", "Too many responses. Try again later.");
      }
    }

    const [row] = await db
      .select({
        responseId: requestResponses.id,
        donorId: requestResponses.donorId,
        publicId: bloodRequests.publicId,
      })
      .from(requestResponses)
      .innerJoin(bloodRequests, eq(bloodRequests.id, requestResponses.requestId))
      .where(eq(requestResponses.respondToken, token))
      .limit(1);

    if (!row) throw new ApiError(404, "invalid_token", "This link is not valid.");

    const result = await submitResponse(db, {
      requestPublicId: row.publicId,
      donorId: row.donorId,
      action: body.action,
      note: body.note,
      ipHash,
      respondToken: token,
    });

    return jsonOk({ ok: true, ...result });
  } catch (error) {
    return jsonError(error);
  }
}
