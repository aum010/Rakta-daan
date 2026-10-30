import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { donors, users } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { recordConsent } from "@/lib/consent";
import { POLICY_VERSION, RATE_LIMITS } from "@/lib/constants";
import { blindIndex, hashIp } from "@/lib/crypto";
import { recordAudit } from "@/lib/audit";
import { consumeRateLimit } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone";
import {
  ApiError,
  assertSameOrigin,
  clientIp,
  jsonError,
  jsonOk,
  parseJson,
} from "@/lib/http";
import { donorRegistrationSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireApiUser();
    const body = await parseJson(req, donorRegistrationSchema);
    const db = getDb();

    const limit = await consumeRateLimit(db, {
      bucket: "donor_register_ip",
      key: hashIp(clientIp(req)) ?? "unknown",
      ...RATE_LIMITS.registerPerIp,
    });
    if (!limit.allowed) {
      throw new ApiError(429, "rate_limited", "Too many attempts. Try again later.");
    }

    const phone = normalizePhone(body.phone);
    if (!phone.ok) throw new ApiError(422, "invalid_phone", "Enter a valid phone number.");

    const [account] = await db
      .select({ phoneHash: users.phoneHash })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    if (!account) throw new ApiError(401, "unauthorized", "Sign in again.");
    if (account.phoneHash !== blindIndex(phone.e164, "phone")) {
      throw new ApiError(
        422,
        "phone_mismatch",
        "Use the phone number this account signed in with, or sign in with that number.",
      );
    }

    const [existing] = await db
      .select()
      .from(donors)
      .where(eq(donors.userId, user.id))
      .limit(1);

    if (existing && !existing.withdrawnAt) {
      throw new ApiError(409, "donor_exists", "You already have an active donor profile.");
    }

    const values = {
      userId: user.id,
      bloodGroup: body.bloodGroup,
      sex: body.sex,
      dateOfBirth: body.dateOfBirth,
      weightKg: body.weightKg ?? null,
      provinceCode: body.provinceCode,
      districtCode: body.districtCode,
      municipality: body.municipality ?? null,
      ward: body.ward ?? null,
      availability: "available" as const,
      availabilityConfirmedAt: new Date(),
      lastDonationDate: body.lastDonationDate ?? null,
      consentAlerts: true,
      consentSms: body.consentSms,
      consentWhatsapp: body.consentWhatsapp,
      consentVersion: POLICY_VERSION,
      withdrawnAt: null,
      updatedAt: new Date(),
    };

    let donorId: string;
    if (existing) {
      await db.update(donors).set(values).where(eq(donors.id, existing.id));
      donorId = existing.id;
    } else {
      const [created] = await db.insert(donors).values(values).returning({ id: donors.id });
      if (!created) throw new ApiError(500, "create_failed", "Could not save the donor profile.");
      donorId = created.id;
    }

    await db
      .update(users)
      .set({ name: body.name, locale: body.locale, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    const consents = [
      { kind: "terms" as const, granted: true },
      { kind: "donor_alerts" as const, granted: true },
      { kind: "channel_sms" as const, granted: body.consentSms },
      { kind: "channel_whatsapp" as const, granted: body.consentWhatsapp },
      { kind: "contact_release_on_response" as const, granted: true },
    ];
    const ipHash = hashIp(clientIp(req));
    for (const consent of consents) {
      await recordConsent(db, { donorId, kind: consent.kind, granted: consent.granted, ipHash });
    }

    await recordAudit(db, {
      actorUserId: user.id,
      actorRole: "donor",
      action: existing ? "donor.rejoined" : "donor.created",
      entityType: "donor",
      entityId: donorId,
      metadata: {
        bloodGroup: body.bloodGroup,
        district: body.districtCode,
        channels: [body.consentSms ? "sms" : null, body.consentWhatsapp ? "whatsapp" : null].filter(
          Boolean,
        ),
      },
      ipHash,
    });

    return jsonOk({ ok: true, donorId }, { status: existing ? 200 : 201 });
  } catch (error) {
    return jsonError(error);
  }
}
