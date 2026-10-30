import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { donors, users } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { recordConsent } from "@/lib/consent";
import { POLICY_VERSION } from "@/lib/constants";
import { hashIp } from "@/lib/crypto";
import { recordAudit } from "@/lib/audit";
import { isDistrictInProvince } from "@/data/geography";
import {
  ApiError,
  assertSameOrigin,
  clientIp,
  jsonError,
  jsonOk,
  parseJson,
} from "@/lib/http";
import { donorUpdateSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireApiUser();
    const body = await parseJson(req, donorUpdateSchema);
    const db = getDb();

    const [donor] = await db
      .select()
      .from(donors)
      .where(and(eq(donors.userId, user.id), isNull(donors.withdrawnAt)))
      .limit(1);
    if (!donor) {
      throw new ApiError(404, "donor_not_found", "You do not have an active donor profile.");
    }

    const provinceCode = body.provinceCode ?? donor.provinceCode;
    const districtCode = body.districtCode ?? donor.districtCode;
    if (!isDistrictInProvince(districtCode, provinceCode)) {
      throw new ApiError(422, "invalid_location", "District does not belong to that province.");
    }

    const update: Partial<typeof donors.$inferInsert> = {
      provinceCode,
      districtCode,
      updatedAt: new Date(),
    };
    if (body.municipality !== undefined) update.municipality = body.municipality;
    if (body.ward !== undefined) update.ward = body.ward;
    if (body.lastDonationDate !== undefined) update.lastDonationDate = body.lastDonationDate;
    if (body.deferredUntil !== undefined) update.deferredUntil = body.deferredUntil;
    if (body.deferralReason !== undefined) update.deferralReason = body.deferralReason;
    if (body.availability) {
      update.availability = body.availability;
      if (body.availability === "available") update.availabilityConfirmedAt = new Date();
    }

    const consentChanges: Array<{ kind: "donor_alerts" | "channel_sms" | "channel_whatsapp" | "contact_release_on_response"; granted: boolean }> = [];
    if (body.consentAlerts !== undefined) {
      update.consentAlerts = body.consentAlerts;
      consentChanges.push({ kind: "donor_alerts", granted: body.consentAlerts });
    }
    if (body.consentSms !== undefined) {
      update.consentSms = body.consentSms;
      consentChanges.push({ kind: "channel_sms", granted: body.consentSms });
    }
    if (body.consentWhatsapp !== undefined) {
      update.consentWhatsapp = body.consentWhatsapp;
      consentChanges.push({ kind: "channel_whatsapp", granted: body.consentWhatsapp });
    }
    if (body.consentContactRelease !== undefined) {
      consentChanges.push({
        kind: "contact_release_on_response",
        granted: body.consentContactRelease,
      });
    }

    const nextSms = update.consentSms ?? donor.consentSms;
    const nextWhatsapp = update.consentWhatsapp ?? donor.consentWhatsapp;
    if (update.consentAlerts !== false && !nextSms && !nextWhatsapp) {
      throw new ApiError(
        422,
        "no_channel",
        "Keep at least one messaging channel enabled, or turn off emergency alerts.",
      );
    }

    await db.update(donors).set(update).where(eq(donors.id, donor.id));

    const ipHash = hashIp(clientIp(req));
    for (const change of consentChanges) {
      await recordConsent(db, {
        donorId: donor.id,
        kind: change.kind,
        granted: change.granted,
        ipHash,
        version: POLICY_VERSION,
      });
    }

    if (body.consentAlerts === false) {
      // Keep the profile but stop matching it.
      await db
        .update(donors)
        .set({ availability: "paused", updatedAt: new Date() })
        .where(eq(donors.id, donor.id));
    }

    await recordAudit(db, {
      actorUserId: user.id,
      actorRole: "donor",
      action: "donor.updated",
      entityType: "donor",
      entityId: donor.id,
      metadata: {
        availability: update.availability ?? donor.availability,
        consentsChanged: consentChanges.map((change) => change.kind),
      },
      ipHash,
    });

    const [updated] = await db.select().from(donors).where(eq(donors.id, donor.id)).limit(1);
    return jsonOk({ ok: true, donor: updated });
  } catch (error) {
    return jsonError(error);
  }
}

/** Leaving the donor list: stop all alerts and keep consent history. */
export async function DELETE(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireApiUser();
    const db = getDb();
    const [donor] = await db
      .select()
      .from(donors)
      .where(and(eq(donors.userId, user.id), isNull(donors.withdrawnAt)))
      .limit(1);
    if (!donor) throw new ApiError(404, "donor_not_found", "No active donor profile.");

    await db
      .update(donors)
      .set({
        withdrawnAt: new Date(),
        availability: "unavailable",
        consentAlerts: false,
        updatedAt: new Date(),
      })
      .where(eq(donors.id, donor.id));

    const ipHash = hashIp(clientIp(req));
    for (const kind of ["donor_alerts", "channel_sms", "channel_whatsapp"] as const) {
      await recordConsent(db, { donorId: donor.id, kind, granted: false, ipHash });
    }
    await recordAudit(db, {
      actorUserId: user.id,
      actorRole: "donor",
      action: "donor.withdrawn",
      entityType: "donor",
      entityId: donor.id,
      ipHash,
    });

    await db
      .update(users)
      .set({ updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
