import type { NextRequest } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { otpCodes, users } from "@/db/schema";
import { blindIndex, randomDigits, sha256Hex } from "@/lib/crypto";
import { getAdapter } from "@/lib/messaging/adapters";
import { normalizePhone } from "@/lib/phone";
import { OTP_MAX_ATTEMPTS, OTP_TTL_MINUTES, RATE_LIMITS } from "@/lib/constants";
import { consumeRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import { clientIpHash, jsonOk, jsonError, parseJson, assertSameOrigin, ApiError } from "@/lib/http";
import { env } from "@/lib/env";
import { otpRequestSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const body = await parseJson(req, otpRequestSchema);
    const db = getDb();
    const phone = normalizePhone(body.phone);
    if (!phone.ok) throw new ApiError(422, "invalid_phone", "Enter a valid phone number.");

    const phoneHash = blindIndex(phone.e164, "phone");
    const ipHash = clientIpHash(req);

    const perPhone = await consumeRateLimit(db, {
      bucket: "otp_request_phone",
      key: phoneHash,
      ...RATE_LIMITS.otpRequestPerPhone,
    });
    if (!perPhone.allowed) {
      throw new ApiError(429, "rate_limited", "Too many codes requested. Try again later.");
    }
    if (ipHash) {
      const perIp = await consumeRateLimit(db, {
        bucket: "otp_request_ip",
        key: ipHash,
        ...RATE_LIMITS.otpRequestPerIp,
      });
      if (!perIp.allowed) {
        throw new ApiError(429, "rate_limited", "Too many codes requested. Try again later.");
      }
    }

    const [existingUser] = await db
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.phoneHash, phoneHash))
      .limit(1);

    if (existingUser?.status === "suspended") {
      // Do not reveal account state differences beyond this explicit case.
      throw new ApiError(403, "account_suspended", "This account is suspended.");
    }

    // Only the newest code can be used.
    await db
      .update(otpCodes)
      .set({ consumedAt: new Date() })
      .where(
        and(eq(otpCodes.phoneHash, phoneHash), isNull(otpCodes.consumedAt), gt(otpCodes.expiresAt, new Date())),
      );

    const secureCode = randomDigits(6);

    await db.insert(otpCodes).values({
      phoneHash,
      purpose: "login",
      codeHash: sha256Hex(`${phoneHash}:${secureCode}`),
      maxAttempts: OTP_MAX_ATTEMPTS,
      ipHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
    });

    const adapter = getAdapter("sms");
    const outcome = await adapter.send({
      channel: "sms",
      to: phone.e164,
      template: "otp_login",
      locale: body.locale ?? "en",
      params: {},
      text:
        body.locale === "ne"
          ? `रक्त-दान कोड: ${secureCode} (${OTP_TTL_MINUTES} मिनेट)। कसैलाई नबताउनुहोस्।`
          : `Rakta-Daan code: ${secureCode} (valid ${OTP_TTL_MINUTES} min). Do not share this code.`,
    });

    await recordAudit(db, {
      action: "auth.otp_requested",
      entityType: "user",
      entityId: existingUser?.id ?? undefined,
      metadata: { provider: outcome.provider, status: outcome.status, isNewUser: !existingUser },
      ipHash,
    });

    if (outcome.status === "skipped") {
      throw new ApiError(
        503,
        "provider_not_configured",
        "SMS delivery is not configured. Ask the administrator to configure a messaging provider.",
      );
    }
    if (outcome.status === "failed") {
      throw new ApiError(502, "delivery_failed", "The code could not be sent. Try again shortly.");
    }

    return jsonOk({
      ok: true,
      expiresInSeconds: OTP_TTL_MINUTES * 60,
      // Never exposed in production (env.exposeOtp is forced false there).
      devCode: env.exposeOtp ? secureCode : undefined,
      simulated: outcome.simulated ?? false,
      delivery: outcome.simulated ? "simulated" : "sent",
    });
  } catch (error) {
    return jsonError(error);
  }
}
