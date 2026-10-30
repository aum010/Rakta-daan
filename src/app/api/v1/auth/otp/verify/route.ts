import type { NextRequest } from "next/server";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { otpCodes, users } from "@/db/schema";
import { createSession, toSessionUser } from "@/lib/auth";
import { blindIndex, encryptString, sha256Hex } from "@/lib/crypto";
import { normalizePhone } from "@/lib/phone";
import { RATE_LIMITS } from "@/lib/constants";
import { consumeRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import {
  ApiError,
  assertSameOrigin,
  clientIp,
  clientIpHash,
  jsonError,
  jsonOk,
  parseJson,
} from "@/lib/http";
import { otpVerifySchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const body = await parseJson(req, otpVerifySchema);
    const db = getDb();
    const phone = normalizePhone(body.phone);
    if (!phone.ok) throw new ApiError(422, "invalid_phone", "Enter a valid phone number.");
    const phoneHash = blindIndex(phone.e164, "phone");
    const ipHash = clientIpHash(req);

    const limit = await consumeRateLimit(db, {
      bucket: "otp_verify_phone",
      key: phoneHash,
      ...RATE_LIMITS.otpVerifyPerPhone,
    });
    if (!limit.allowed) {
      throw new ApiError(429, "rate_limited", "Too many attempts. Try again later.");
    }

    const [otp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.phoneHash, phoneHash),
          isNull(otpCodes.consumedAt),
          gt(otpCodes.expiresAt, new Date()),
        ),
      )
      .orderBy(sql`${otpCodes.createdAt} desc`)
      .limit(1);

    if (!otp) {
      throw new ApiError(401, "invalid_code", "That code is not correct or has expired.");
    }
    if (otp.attempts >= otp.maxAttempts) {
      throw new ApiError(429, "too_many_attempts", "Too many attempts. Request a new code.");
    }

    await db
      .update(otpCodes)
      .set({ attempts: sql`${otpCodes.attempts} + 1` })
      .where(eq(otpCodes.id, otp.id));

    const expected = sha256Hex(`${phoneHash}:${body.code}`);
    if (expected !== otp.codeHash) {
      throw new ApiError(401, "invalid_code", "That code is not correct or has expired.");
    }

    await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, otp.id));

    let [user] = await db.select().from(users).where(eq(users.phoneHash, phoneHash)).limit(1);
    let isNew = false;

    if (!user) {
      if (!body.name || body.name.trim().length < 2) {
        throw new ApiError(
          409,
          "profile_required",
          "This number is new. Enter your name to create an account.",
        );
      }
      const [created] = await db
        .insert(users)
        .values({
          phoneHash,
          phoneEnc: encryptString(phone.e164, "phone"),
          phoneMasked: phone.masked,
          name: body.name.trim(),
          locale: body.locale ?? "en",
          phoneVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        })
        .returning();
      if (!created) throw new ApiError(500, "account_create_failed", "Could not create the account.");
      user = created;
      isNew = true;
    } else {
      if (user.status !== "active") {
        throw new ApiError(403, "account_suspended", "This account is suspended.");
      }
      await db
        .update(users)
        .set({
          lastLoginAt: new Date(),
          phoneVerifiedAt: user.phoneVerifiedAt ?? new Date(),
          locale: body.locale ?? user.locale,
        })
        .where(eq(users.id, user.id));
    }

    await createSession(db, user.id, {
      ip: clientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    await recordAudit(db, {
      actorUserId: user.id,
      actorRole: user.isAdmin ? "admin" : "user",
      action: "auth.login",
      entityType: "user",
      entityId: user.id,
      metadata: { isNew },
      ipHash,
    });

    return jsonOk({
      ok: true,
      isNew,
      user: toSessionUser(user),
      // Returned so a first-time donor knows where to continue.
      next: `/donor`,
    });
  } catch (error) {
    return jsonError(error);
  }
}
