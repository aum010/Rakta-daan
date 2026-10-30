import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { donors } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
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
  context: { params: Promise<{ publicId: string }> },
) {
  try {
    assertSameOrigin(req);
    const user = await requireApiUser();
    const { publicId } = await context.params;
    const body = await parseJson(req, responseActionSchema);
    const db = getDb();

    const [donor] = await db
      .select({ id: donors.id })
      .from(donors)
      .where(and(eq(donors.userId, user.id), isNull(donors.withdrawnAt)))
      .limit(1);
    if (!donor) {
      throw new ApiError(403, "not_a_donor", "Only registered donors can respond.");
    }

    const limit = await consumeRateLimit(db, {
      bucket: "response_user",
      key: user.id,
      ...RATE_LIMITS.responsePerUser,
    });
    if (!limit.allowed) {
      throw new ApiError(429, "rate_limited", "Too many responses. Try again later.");
    }

    const result = await submitResponse(db, {
      requestPublicId: publicId,
      donorId: donor.id,
      action: body.action,
      note: body.note,
      ipHash: clientIpHash(req),
    });

    return jsonOk({ ok: true, ...result });
  } catch (error) {
    return jsonError(error);
  }
}
