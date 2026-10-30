import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { requireApiUser } from "@/lib/auth";
import { RATE_LIMITS } from "@/lib/constants";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createBloodRequest } from "@/lib/requests";
import {
  ApiError,
  assertSameOrigin,
  clientIpHash,
  jsonError,
  jsonOk,
  parseJson,
} from "@/lib/http";
import { requestCreateSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireApiUser();
    const body = await parseJson(req, requestCreateSchema);
    const db = getDb();
    const ipHash = clientIpHash(req);

    const perUser = await consumeRateLimit(db, {
      bucket: "request_create_user",
      key: user.id,
      ...RATE_LIMITS.requestCreatePerUser,
    });
    if (!perUser.allowed) {
      throw new ApiError(429, "rate_limited", "Too many requests created. Try again later.");
    }
    if (ipHash) {
      const perIp = await consumeRateLimit(db, {
        bucket: "request_create_ip",
        key: ipHash,
        ...RATE_LIMITS.requestCreatePerIp,
      });
      if (!perIp.allowed) {
        throw new ApiError(429, "rate_limited", "Too many requests created. Try again later.");
      }
    }

    const created = await createBloodRequest(db, { userId: user.id, input: body, ipHash });

    return jsonOk(
      {
        ok: true,
        id: created.id,
        publicId: created.publicId,
        notified: created.notified,
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
