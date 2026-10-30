import { and, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import type { z } from "zod";
import type { Db } from "@/db";
import {
  bloodInventory,
  bloodRequests,
  donors,
  organizations,
  requestResponses,
  users,
} from "@/db/schema";
import { DISTRICT_BY_CODE, PROVINCE_BY_CODE } from "@/data/geography";
import { supportsCompatibilityMatching } from "./blood";
import {
  DEFAULT_RADIUS_KM,
  INVENTORY_STALE_HOURS,
  MAX_DONORS_NOTIFIED_PER_REQUEST,
  REQUEST_EXPIRY_HOURS,
} from "./constants";
import { encryptString, publicId as newPublicId, randomToken } from "./crypto";
import { addHours, hoursSince } from "./dates";
import { ApiError } from "./http";
import { districtDistanceKm } from "./geo";
import { findDonorCandidates } from "./matching";
import { getDonorConsents } from "./consent";
import { recordAudit } from "./audit";
import { enqueueMessage, dispatchQueued } from "./messaging/outbox";
import {
  donorAlertParams,
  requestAlertText,
  requesterUpdateText,
} from "./messaging/templates";
import { normalizePhone } from "./phone";
import { env } from "./env";
import { requestCreateSchema } from "./validation";

export type CreateRequestInput = z.infer<typeof requestCreateSchema>;

export type NotifyResult = {
  notified: number;
  considered: number;
  simulated: number;
  pending: number;
  failed: number;
};

export function districtName(code: string, locale: "en" | "ne"): string {
  const district = DISTRICT_BY_CODE.get(code);
  if (!district) return code;
  return locale === "ne" ? district.nameNe : district.nameEn;
}

export function provinceName(code: string, locale: "en" | "ne"): string {
  const province = PROVINCE_BY_CODE.get(code);
  if (!province) return code;
  return locale === "ne" ? province.nameNe : province.nameEn;
}

async function generateUniquePublicId(db: Db): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = newPublicId(10);
    const [clash] = await db
      .select({ id: bloodRequests.id })
      .from(bloodRequests)
      .where(eq(bloodRequests.publicId, candidate))
      .limit(1);
    if (!clash) return candidate;
  }
  throw new ApiError(503, "id_generation_failed", "Could not create a request id.");
}

export async function createBloodRequest(
  db: Db,
  options: {
    userId: string;
    input: CreateRequestInput;
    ipHash: string | null;
  },
): Promise<{ id: string; publicId: string; notified: NotifyResult }> {
  const { input } = options;
  const phone = normalizePhone(input.contactPhone);
  if (!phone.ok) {
    throw new ApiError(422, "invalid_phone", "Enter a valid contact phone number.");
  }

  const [duplicate] = await db
    .select({ id: bloodRequests.id, publicId: bloodRequests.publicId })
    .from(bloodRequests)
    .where(
      and(
        eq(bloodRequests.createdByUserId, options.userId),
        eq(bloodRequests.districtCode, input.districtCode),
        eq(bloodRequests.bloodGroupNeeded, input.bloodGroupNeeded),
        eq(bloodRequests.status, "open"),
      ),
    )
    .limit(1);

  if (duplicate) {
    throw new ApiError(
      409,
      "duplicate_request",
      `You already have an open request for this blood group in this district (${duplicate.publicId}). Update that request instead of creating another.`,
    );
  }

  const publicId = await generateUniquePublicId(db);
  const now = new Date();

  const [created] = await db
    .insert(bloodRequests)
    .values({
      publicId,
      createdByUserId: options.userId,
      bloodGroupNeeded: input.bloodGroupNeeded,
      component: input.component,
      unitsNeeded: input.unitsNeeded,
      urgency: input.urgency,
      provinceCode: input.provinceCode,
      districtCode: input.districtCode,
      hospitalName: input.hospitalName,
      neededBy: new Date(input.neededBy),
      contactName: input.contactName,
      contactPhoneEnc: encryptString(phone.e164, "request-contact"),
      contactPhoneMasked: phone.masked,
      patientReferenceEnc: input.patientReference
        ? encryptString(input.patientReference, "patient-reference")
        : null,
      clinicalNote: input.clinicalNote ? input.clinicalNote : null,
      shareContactPublicly: input.shareContactPublicly,
      expiresAt: addHours(now, REQUEST_EXPIRY_HOURS[input.urgency]),
    })
    .returning({ id: bloodRequests.id, publicId: bloodRequests.publicId });

  if (!created) throw new ApiError(500, "insert_failed", "Could not save the request.");

  await recordAudit(db, {
    actorUserId: options.userId,
    actorRole: "requester",
    action: "request.created",
    entityType: "blood_request",
    entityId: created.id,
    metadata: {
      bloodGroup: input.bloodGroupNeeded,
      district: input.districtCode,
      urgency: input.urgency,
      component: input.component,
    },
    ipHash: options.ipHash,
  });

  const notified = await notifyDonorsForRequest(db, created.id, {
    radiusKm: input.notifyRadiusKm,
  });

  return { id: created.id, publicId: created.publicId, notified };
}

/**
 * Matches eligible donors and queues one alert per donor. Sending is done by the
 * outbox, so a provider outage never loses the alert.
 */
export async function notifyDonorsForRequest(
  db: Db,
  requestId: string,
  options: { radiusKm?: number; limit?: number; now?: Date } = {},
): Promise<NotifyResult> {
  const [request] = await db
    .select()
    .from(bloodRequests)
    .where(eq(bloodRequests.id, requestId))
    .limit(1);
  if (!request || request.status !== "open") {
    throw new ApiError(409, "request_not_open", "This request is no longer open.");
  }

  const existing = await db
    .select({ donorId: requestResponses.donorId })
    .from(requestResponses)
    .where(eq(requestResponses.requestId, requestId));

  const limit = options.limit ?? MAX_DONORS_NOTIFIED_PER_REQUEST;
  const radiusKm = options.radiusKm ?? DEFAULT_RADIUS_KM;

  const { matches, considered } = await findDonorCandidates(
    db,
    {
      bloodGroupNeeded: request.bloodGroupNeeded,
      component: request.component,
      districtCode: request.districtCode,
      createdByUserId: request.createdByUserId,
    },
    {
      radiusKm,
      limit,
      excludeDonorIds: existing.map((row) => row.donorId),
      now: options.now,
    },
  );

  if (matches.length === 0) {
    return { notified: 0, considered, simulated: 0, pending: 0, failed: 0 };
  }

  const details = await db
    .select({
      donorId: donors.id,
      userId: donors.userId,
      consentSms: donors.consentSms,
      consentWhatsapp: donors.consentWhatsapp,
      name: users.name,
      locale: users.locale,
      phoneHash: users.phoneHash,
    })
    .from(donors)
    .innerJoin(users, eq(users.id, donors.userId))
    .where(
      inArray(
        donors.id,
        matches.map((match) => match.donor.donorId),
      ),
    );

  const byId = new Map(details.map((row) => [row.donorId, row]));
  const districtLabel = districtName(request.districtCode, "en");
  let notified = 0;

  for (const match of matches) {
    const detail = byId.get(match.donor.donorId);
    if (!detail) continue;

    const channel = detail.consentWhatsapp
      ? ("whatsapp" as const)
      : detail.consentSms
        ? ("sms" as const)
        : null;
    if (!channel) continue;

    const respondToken = randomToken(24);
    const inserted = await db
      .insert(requestResponses)
      .values({
        requestId,
        donorId: match.donor.donorId,
        respondToken,
        matchScore: match.score,
        distanceKm: match.distanceKm,
        status: "notified",
        notifiedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: requestResponses.id });

    if (inserted.length === 0) continue;

    const locale = detail.locale === "ne" ? "ne" : "en";
    const respondUrl = `${env.appUrl}/${locale}/respond/${respondToken}`;
    const alertData = {
      donorFirstName: detail.name.split(" ")[0] ?? detail.name,
      bloodGroup: request.bloodGroupNeeded,
      hospital: request.hospitalName,
      district: districtLabel,
      urgency: request.urgency,
      neededBy: new Date(request.neededBy),
      respondUrl,
      locale,
    } as const;

    await enqueueMessage(db, {
      idempotencyKey: `req:${requestId}:donor:${match.donor.donorId}:${channel}`,
      channel,
      template: "request_alert",
      recipientUserId: detail.userId,
      donorId: match.donor.donorId,
      requestId,
      toPhoneHash: detail.phoneHash,
      params: {
        ...donorAlertParams({ ...alertData }),
        respond_token: respondToken,
        locale,
        blood_group_raw: request.bloodGroupNeeded,
        urgency_raw: request.urgency,
        needed_by_iso: new Date(request.neededBy).toISOString(),
      },
      text: requestAlertText(alertData),
      consentSnapshot: {
        alertConsent: true,
        channel,
        policyVersion: "2026-10",
      },
    });
    notified += 1;
  }

  const dispatch = await dispatchQueued(db, { limit: Math.max(notified, 5) });

  return {
    notified,
    considered,
    simulated: dispatch.simulated,
    pending: dispatch.retried,
    failed: dispatch.failed,
  };
}

export async function expireStaleRequests(db: Db, now = new Date()): Promise<number> {
  const expired = await db
    .update(bloodRequests)
    .set({ status: "expired", closedAt: now, closeReason: "expired", updatedAt: now })
    .where(and(eq(bloodRequests.status, "open"), lte(bloodRequests.expiresAt, now)))
    .returning({ id: bloodRequests.id });
  if (expired.length > 0) {
    await recordAudit(db, {
      action: "request.expired_batch",
      entityType: "blood_request",
      metadata: { count: expired.length },
    });
  }
  return expired.length;
}

export async function closeRequest(
  db: Db,
  options: {
    requestId: string;
    userId: string;
    status: "fulfilled" | "cancelled";
    reason?: string;
    ipHash: string | null;
    isAdmin?: boolean;
  },
): Promise<void> {
  const [request] = await db
    .select()
    .from(bloodRequests)
    .where(eq(bloodRequests.id, options.requestId))
    .limit(1);
  if (!request) throw new ApiError(404, "not_found", "Request not found.");
  if (request.createdByUserId !== options.userId && !options.isAdmin) {
    throw new ApiError(403, "forbidden", "You can only close your own request.");
  }
  if (request.status !== "open") {
    throw new ApiError(409, "already_closed", "This request is already closed.");
  }

  await db
    .update(bloodRequests)
    .set({
      status: options.status,
      closedAt: new Date(),
      closeReason: options.reason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(bloodRequests.id, options.requestId));

  await recordAudit(db, {
    actorUserId: options.userId,
    actorRole: options.isAdmin ? "admin" : "requester",
    action: `request.${options.status}`,
    entityType: "blood_request",
    entityId: options.requestId,
    metadata: { reason: options.reason ?? null },
    ipHash: options.ipHash,
  });
}

export type ResponseAction = "interested" | "declined" | "donated" | "withdrawn";

export async function submitResponse(
  db: Db,
  options: {
    requestPublicId: string;
    donorId: string;
    action: ResponseAction;
    note?: string;
    ipHash: string | null;
    respondToken?: string;
  },
): Promise<{ status: ResponseAction; requesterNotified: boolean }> {
  const [request] = await db
    .select()
    .from(bloodRequests)
    .where(eq(bloodRequests.publicId, options.requestPublicId))
    .limit(1);
  if (!request) throw new ApiError(404, "not_found", "Request not found.");

  let [response] = await db
    .select()
    .from(requestResponses)
    .where(
      and(
        eq(requestResponses.requestId, request.id),
        eq(requestResponses.donorId, options.donorId),
      ),
    )
    .limit(1);

  // A registered donor may volunteer from the public request page even if they
  // were not in the original alert batch. Magic links stay restricted to the
  // response they were issued for.
  if (!response) {
    if (options.respondToken) {
      throw new ApiError(404, "invalid_token", "This link is not valid.");
    }
    const [created] = await db
      .insert(requestResponses)
      .values({
        requestId: request.id,
        donorId: options.donorId,
        respondToken: randomToken(24),
        status: options.action,
        donorNote: options.note ?? null,
        respondedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();
    if (!created) {
      throw new ApiError(409, "response_conflict", "Please refresh and try again.");
    }
    response = created;
  } else if (options.respondToken && options.respondToken !== response.respondToken) {
    throw new ApiError(403, "invalid_token", "This link is not valid for this request.");
  }
  if (request.status !== "open" && options.action !== "donated") {
    throw new ApiError(409, "request_closed", "This request is no longer open.");
  }

  if (options.action === "interested") {
    const consents = await getDonorConsents(db, options.donorId);
    if (!consents.contact_release_on_response) {
      throw new ApiError(
        409,
        "contact_consent_required",
        "To say you can help, enable contact sharing in your donor settings first.",
      );
    }
  }

  await db
    .update(requestResponses)
    .set({
      status: options.action,
      donorNote: options.note ?? null,
      respondedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(requestResponses.id, response.id));

  await recordAudit(db, {
    actorRole: "donor",
    action: `response.${options.action}`,
    entityType: "request_response",
    entityId: response.id,
    metadata: { requestId: request.id },
    ipHash: options.ipHash,
  });

  let requesterNotified = false;
  if (options.action === "interested" || options.action === "donated") {
    const [requester] = await db
      .select({ phoneHash: users.phoneHash, locale: users.locale })
      .from(users)
      .where(eq(users.id, request.createdByUserId))
      .limit(1);
    if (requester) {
      const locale = requester.locale === "ne" ? "ne" : "en";
      const dashboardUrl = `${env.appUrl}/${locale}/dashboard/requests/${request.publicId}`;
      const text = requesterUpdateText({
        publicId: request.publicId,
        donorAction: options.action,
        dashboardUrl,
        locale,
      });
      const inserted = await enqueueMessage(db, {
        idempotencyKey: `resp:${response.id}:${options.action}:requester:${request.createdByUserId}`,
        channel: "sms",
        template: "requester_update",
        recipientUserId: request.createdByUserId,
        requestId: request.id,
        toPhoneHash: requester.phoneHash,
        params: {
          public_id: request.publicId,
          donor_action: options.action,
          dashboard_url: dashboardUrl,
          locale,
        },
        text,
        consentSnapshot: { basis: "request_contact", locale },
      });
      requesterNotified = inserted;
      await dispatchQueued(db, { limit: 5 });
    }
  }

  return { status: options.action, requesterNotified };
}

export type AvailabilityBank = {
  slug: string;
  name: string;
  nameNe: string | null;
  verification: "unverified" | "pending" | "verified" | "rejected" | "suspended";
  districtCode: string;
  distanceKm: number | null;
  units: number | null;
  updatedAt: Date | null;
  stale: boolean;
  source: "manual" | "api_feed" | null;
};

export type AvailabilitySummary = {
  donorCount: number | "few";
  exactDonorCount: number;
  radiusKm: number;
  compatibleGroups: string[];
  banks: AvailabilityBank[];
  matchingSupported: boolean;
};

export async function availabilitySummary(
  db: Db,
  options: {
    bloodGroup: CreateRequestInput["bloodGroupNeeded"];
    districtCode: string;
    radiusKm?: number;
    now?: Date;
  },
): Promise<AvailabilitySummary> {
  const radiusKm = options.radiusKm ?? DEFAULT_RADIUS_KM;
  const { matches } = await findDonorCandidates(
    db,
    {
      bloodGroupNeeded: options.bloodGroup,
      component: "whole_blood",
      districtCode: options.districtCode,
      createdByUserId: "00000000-0000-0000-0000-000000000000",
    },
    { radiusKm, now: options.now },
  );

  const banks = await db
    .select({
      slug: organizations.slug,
      name: organizations.name,
      nameNe: organizations.nameNe,
      verification: organizations.verification,
      districtCode: organizations.districtCode,
      units: bloodInventory.units,
      updatedAt: bloodInventory.updatedAt,
      source: bloodInventory.source,
    })
    .from(organizations)
    .leftJoin(
      bloodInventory,
      and(
        eq(bloodInventory.orgId, organizations.id),
        eq(bloodInventory.bloodGroup, options.bloodGroup),
        eq(bloodInventory.component, "whole_blood"),
      ),
    )
    .where(
      and(eq(organizations.isPublic, true), sql`${organizations.verification} <> 'suspended'`),
    );

  const now = options.now ?? new Date();

  const mappedBanks: AvailabilityBank[] = banks
    .map((bank) => {
      const distanceKm = districtDistanceKm(options.districtCode, bank.districtCode);
      const updatedAt = bank.updatedAt ? new Date(bank.updatedAt) : null;
      return {
        slug: bank.slug,
        name: bank.name,
        nameNe: bank.nameNe,
        verification: bank.verification,
        districtCode: bank.districtCode,
        distanceKm,
        units: bank.units,
        updatedAt,
        stale: updatedAt ? hoursSince(updatedAt, now) >= INVENTORY_STALE_HOURS : true,
        source: bank.source,
      };
    })
    .filter((bank) => bank.distanceKm === null || bank.distanceKm <= radiusKm)
    .sort((a, b) => {
      if (a.verification === "verified" && b.verification !== "verified") return -1;
      if (b.verification === "verified" && a.verification !== "verified") return 1;
      return (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999);
    })
    .slice(0, 20);

  const count = matches.length;
  return {
    // k-anonymity: never expose an exact count below 3.
    donorCount: count >= 3 ? count : count > 0 ? "few" : 0,
    exactDonorCount: count,
    radiusKm,
    compatibleGroups: [...new Set(matches.map((m) => m.donor.bloodGroup))],
    banks: mappedBanks,
    matchingSupported: supportsCompatibilityMatching("whole_blood"),
  };
}

/** Called by the donor dashboard to show outstanding invitations. */
export async function pendingInvitations(db: Db, donorId: string) {
  return db
    .select({
      responseId: requestResponses.id,
      respondToken: requestResponses.respondToken,
      responseStatus: requestResponses.status,
      publicId: bloodRequests.publicId,
      bloodGroup: bloodRequests.bloodGroupNeeded,
      urgency: bloodRequests.urgency,
      hospital: bloodRequests.hospitalName,
      districtCode: bloodRequests.districtCode,
      neededBy: bloodRequests.neededBy,
      createdAt: bloodRequests.createdAt,
      requestStatus: bloodRequests.status,
    })
    .from(requestResponses)
    .innerJoin(bloodRequests, eq(bloodRequests.id, requestResponses.requestId))
    .where(
      and(
        eq(requestResponses.donorId, donorId),
        inArray(requestResponses.status, ["notified", "viewed", "interested"]),
      ),
    )
    .orderBy(bloodRequests.neededBy)
    .limit(20);
}

export async function donorByUserId(db: Db, userId: string) {
  const [row] = await db
    .select()
    .from(donors)
    .where(and(eq(donors.userId, userId), isNull(donors.withdrawnAt)))
    .limit(1);
  return row ?? null;
}
