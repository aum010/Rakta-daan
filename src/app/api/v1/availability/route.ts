import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { RATE_LIMITS } from "@/lib/constants";
import { consumeRateLimit } from "@/lib/rate-limit";
import { availabilitySummary } from "@/lib/requests";
import { ApiError, clientIpHash, jsonError, jsonOk } from "@/lib/http";
import { availabilityQuerySchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const parsed = availabilityQuerySchema.safeParse({
      group: params.get("group") ?? undefined,
      district: params.get("district") ?? undefined,
      radiusKm: params.get("radius") ?? params.get("radiusKm") ?? 75,
    });
    if (!parsed.success) {
      throw new ApiError(422, "validation_error", "Provide group, district and radius.");
    }

    const db = getDb();
    const ipHash = clientIpHash(req);
    if (ipHash) {
      const limit = await consumeRateLimit(db, {
        bucket: "availability_ip",
        key: ipHash,
        ...RATE_LIMITS.donorSearchPerIp,
      });
      if (!limit.allowed) {
        throw new ApiError(429, "rate_limited", "Too many searches. Try again shortly.");
      }
    }

    const summary = await availabilitySummary(db, {
      bloodGroup: parsed.data.group,
      districtCode: parsed.data.district,
      radiusKm: parsed.data.radiusKm,
    });

    return jsonOk({ ok: true, ...summary });
  } catch (error) {
    return jsonError(error);
  }
}
