/**
 * Donor matching.
 *
 * Documented rules (docs/product/product-requirements.md §matching):
 *  1. Only donors with a self-reported `available` state are considered.
 *  2. Availability must have been confirmed within AVAILABILITY_FRESH_DAYS.
 *  3. Red-cell compatibility is applied only for whole blood / packed red cells.
 *  4. A donor inside the 90-day donation interval or with an active deferral is
 *     excluded (recommended clinical interval, not a medical clearance).
 *  5. Explicit alert consent is required, and the requester is never matched to
 *     themselves.
 *  6. Distance is measured between district headquarters — an estimate only.
 *
 * Matching suggests people to *ask*. It never asserts that a donor is medically
 * eligible, and it never implies blood has been located.
 */
import { and, eq, inArray, isNull, ne, type SQL } from "drizzle-orm";
import { donors } from "@/db/schema";
import type { Db } from "@/db";
import {
  AVAILABILITY_FRESH_DAYS,
  DEFAULT_RADIUS_KM,
  DONATION_COOLDOWN_DAYS,
  DONOR_MAX_AGE,
  DONOR_MIN_AGE,
} from "./constants";
import { ageInYears } from "./dates";
import { districtDistanceKm } from "./geo";
import {
  compatibleDonorGroups,
  supportsCompatibilityMatching,
  type BloodComponent,
  type BloodGroup,
} from "./blood";

export type DonorRecord = {
  donorId: string;
  userId: string;
  bloodGroup: BloodGroup;
  dateOfBirth: string;
  districtCode: string;
  provinceCode: string;
  availability: "available" | "unavailable" | "paused";
  availabilityConfirmedAt: Date;
  lastDonationDate: string | null;
  deferredUntil: string | null;
  consentAlerts: boolean;
  verification: "phone_verified" | "id_reviewed";
  withdrawnAt: Date | null;
};

export type RequestCriteria = {
  bloodGroupNeeded: BloodGroup;
  component: BloodComponent;
  districtCode: string;
  createdByUserId: string;
};

export type IneligibilityReason =
  | "withdrawn"
  | "no_alert_consent"
  | "same_user"
  | "unavailable"
  | "stale_availability"
  | "cooldown"
  | "deferred"
  | "age"
  | "out_of_range"
  | "component_not_supported";

export type Evaluation = {
  eligible: boolean;
  reasons: IneligibilityReason[];
  distanceKm: number | null;
  score: number;
};

export type MatchResult = Evaluation & {
  donor: DonorRecord;
};

export type MatchOptions = {
  radiusKm?: number;
  now?: Date;
};

const REASON_TEXT: Record<IneligibilityReason, { en: string; ne: string }> = {
  withdrawn: { en: "Donor withdrew", ne: "दाताले नाम हटाएको" },
  no_alert_consent: { en: "No alert consent", ne: "सूचना अनुमति छैन" },
  same_user: { en: "Requester's own profile", ne: "अनुरोधकर्ताकै प्रोफाइल" },
  unavailable: { en: "Donor is not available", ne: "दाता उपलब्ध छैनन्" },
  stale_availability: { en: "Availability not confirmed recently", ne: "उपलब्धता पुरानो" },
  cooldown: { en: "Within donation interval", ne: "रगत दान अन्तरालभित्र" },
  deferred: { en: "Temporarily deferred", ne: "अस्थायी रूपमा स्थगित" },
  age: { en: "Outside the 18–65 age range", ne: "१८–६५ वर्ष दायरा बाहिर" },
  out_of_range: { en: "Outside the search radius", ne: "खोज दायरा बाहिर" },
  component_not_supported: {
    en: "Compatibility table not used for this component",
    ne: "यो कम्पोनेन्टका लागि मिलान तालिका प्रयोग हुँदैन",
  },
};

export function ineligibilityText(reason: IneligibilityReason, locale: "en" | "ne"): string {
  return REASON_TEXT[reason][locale];
}

export function evaluateDonor(
  donor: DonorRecord,
  request: RequestCriteria,
  options: MatchOptions = {},
): Evaluation {
  const now = options.now ?? new Date();
  const radiusKm = options.radiusKm ?? DEFAULT_RADIUS_KM;
  const reasons: IneligibilityReason[] = [];
  const age = ageInYears(donor.dateOfBirth, now);
  const distanceKm = districtDistanceKm(request.districtCode, donor.districtCode);

  if (donor.withdrawnAt) reasons.push("withdrawn");
  if (!donor.consentAlerts) reasons.push("no_alert_consent");
  if (donor.userId === request.createdByUserId) reasons.push("same_user");
  if (donor.availability !== "available") reasons.push("unavailable");

  const confirmedDaysAgo =
    (now.getTime() - new Date(donor.availabilityConfirmedAt).getTime()) / 86_400_000;
  if (confirmedDaysAgo > AVAILABILITY_FRESH_DAYS) reasons.push("stale_availability");

  if (donor.lastDonationDate) {
    const last = new Date(`${donor.lastDonationDate}T00:00:00Z`);
    const daysSince = (now.getTime() - last.getTime()) / 86_400_000;
    if (daysSince < DONATION_COOLDOWN_DAYS) reasons.push("cooldown");
  }
  if (donor.deferredUntil && new Date(`${donor.deferredUntil}T23:59:59Z`) > now) {
    reasons.push("deferred");
  }
  if (age < DONOR_MIN_AGE || age > DONOR_MAX_AGE) reasons.push("age");
  if (!supportsCompatibilityMatching(request.component)) {
    reasons.push("component_not_supported");
  }
  if (distanceKm !== null && distanceKm > radiusKm) reasons.push("out_of_range");

  const eligible = reasons.length === 0;

  // Ranking: proximity first, then recency of confirmation, then verification.
  let score = 50;
  if (distanceKm !== null) {
    if (distanceKm <= 10) score += 30;
    else if (distanceKm <= 25) score += 24;
    else if (distanceKm <= 50) score += 16;
    else if (distanceKm <= 100) score += 8;
    else score += 2;
  }
  if (confirmedDaysAgo <= 2) score += 10;
  else if (confirmedDaysAgo <= 7) score += 7;
  else if (confirmedDaysAgo <= AVAILABILITY_FRESH_DAYS) score += 3;
  if (donor.verification === "id_reviewed") score += 5;
  if (!donor.lastDonationDate) score += 3;

  return { eligible, reasons, distanceKm, score };
}

export function rankMatches(
  donorRows: DonorRecord[],
  request: RequestCriteria,
  options: MatchOptions = {},
): MatchResult[] {
  return donorRows
    .map((donor) => ({ donor, ...evaluateDonor(donor, request, options) }))
    .filter((result) => result.eligible)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
    });
}

/**
 * Loads donors that could be asked to help with a request.
 * Returns candidates within the radius, plus counts so the UI can explain
 * whether the search was widened or how many people were excluded.
 */
export async function findDonorCandidates(
  db: Db,
  request: RequestCriteria,
  options: MatchOptions & { limit?: number; excludeDonorIds?: string[] } = {},
): Promise<{
  matches: MatchResult[];
  considered: number;
  withinRadius: number;
  radiusKm: number;
}> {
  const groups = compatibleDonorGroups(request.bloodGroupNeeded);
  const filters: SQL[] = [
    eq(donors.availability, "available"),
    eq(donors.consentAlerts, true),
    isNull(donors.withdrawnAt),
    ne(donors.userId, request.createdByUserId),
  ];
  if (groups.length > 0) {
    filters.push(inArray(donors.bloodGroup, [...groups]));
  }
  if (options.excludeDonorIds && options.excludeDonorIds.length > 0) {
    const excluded = new Set(options.excludeDonorIds);
    // Small exclusion lists only; used for "notify more donors".
    const rows = await db
      .select()
      .from(donors)
      .where(and(...filters));
    const mapped = rows.map(mapDonorRow).filter((d) => !excluded.has(d.donorId));
    return summarise(mapped, request, options);
  }

  const rows = await db
    .select()
    .from(donors)
    .where(and(...filters));

  return summarise(rows.map(mapDonorRow), request, options);
}

function summarise(
  donorRows: DonorRecord[],
  request: RequestCriteria,
  options: MatchOptions & { limit?: number },
) {
  const radiusKm = options.radiusKm ?? DEFAULT_RADIUS_KM;
  const matches = rankMatches(donorRows, request, options);
  const withinRadius = matches.length;
  return {
    matches: options.limit ? matches.slice(0, options.limit) : matches,
    considered: donorRows.length,
    withinRadius,
    radiusKm,
  };
}

function mapDonorRow(row: typeof donors.$inferSelect): DonorRecord {
  return {
    donorId: row.id,
    userId: row.userId,
    bloodGroup: row.bloodGroup,
    dateOfBirth: row.dateOfBirth,
    districtCode: row.districtCode,
    provinceCode: row.provinceCode,
    availability: row.availability,
    availabilityConfirmedAt: row.availabilityConfirmedAt,
    lastDonationDate: row.lastDonationDate,
    deferredUntil: row.deferredUntil,
    consentAlerts: row.consentAlerts,
    verification: row.verification,
    withdrawnAt: row.withdrawnAt,
  };
}
