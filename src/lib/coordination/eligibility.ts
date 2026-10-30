/**
 * Eligibility *display* rules.
 *
 * This module deliberately has no authority over who may donate. It converts
 * recorded policy metadata into honest labels, and it is written so that a
 * frontend score can never be mistaken for a clinical clearance:
 *
 *  - `eligible` requires a current, authorised assessment record.
 *  - Anything missing, stale, self-reported or deferred says so, in plain
 *    language, in both locales.
 *  - Availability never overrides an eligibility restriction.
 *
 * Interval policy is configurable metadata (`DonationPolicy`), not a constant
 * baked into the UI — see docs/frontend/donation-history-and-eligibility.md.
 */
import type { EligibilityState } from "./types";

export type DonationPolicy = {
  policyVersion: string;
  /** Minimum whole-blood interval in days, as configured by professionals. */
  wholeBloodIntervalDays: number;
  /** How long an authorised assessment stays current. */
  assessmentValidDays: number;
  /** How long a self-reported availability confirmation stays fresh. */
  availabilityFreshDays: number;
  minAge: number;
  maxAge: number;
  minWeightKg: number;
};

export const DEMO_DONATION_POLICY: DonationPolicy = {
  policyVersion: "demo-2026-10",
  wholeBloodIntervalDays: 90,
  assessmentValidDays: 365,
  availabilityFreshDays: 30,
  minAge: 18,
  maxAge: 65,
  minWeightKg: 45,
};

export type EligibilityVerdict = {
  state: EligibilityState;
  /** i18n key for the human-readable explanation. */
  labelKey: string;
  /** Whether the UI may treat this as "may be invited". */
  inviteAllowed: boolean;
  /** Whether a *medical* claim is being made — always false here. */
  claimsMedicalClearance: false;
};

/**
 * Derives the display state from recorded facts. Missing data yields
 * `requires_review`, never `eligible`.
 */
export function deriveEligibility(input: {
  hasAssessment: boolean;
  assessmentReviewedAt: string | null;
  selfReportedAvailable: boolean;
  deferredUntil: string | null;
  now: Date;
  policy?: DonationPolicy;
}): EligibilityVerdict {
  const policy = input.policy ?? DEMO_DONATION_POLICY;

  if (input.deferredUntil && new Date(input.deferredUntil) > input.now) {
    return verdict("deferred", "eligibility.deferred", false);
  }

  if (!input.hasAssessment) {
    if (input.selfReportedAvailable) {
      return verdict("self_reported", "eligibility.selfReported", true);
    }
    return verdict("requires_review", "eligibility.requiresReview", false);
  }

  const reviewedAt = input.assessmentReviewedAt
    ? new Date(input.assessmentReviewedAt)
    : null;
  if (!reviewedAt || Number.isNaN(reviewedAt.getTime())) {
    return verdict("awaiting_assessment", "eligibility.awaitingAssessment", false);
  }

  const ageDays = (input.now.getTime() - reviewedAt.getTime()) / 86_400_000;
  if (ageDays < 0) {
    return verdict("awaiting_assessment", "eligibility.awaitingAssessment", false);
  }
  if (ageDays > policy.assessmentValidDays) {
    return verdict("assessment_expired", "eligibility.assessmentExpired", false);
  }

  return verdict("eligible", "eligibility.eligible", true);
}

function verdict(
  state: EligibilityState,
  labelKey: string,
  inviteAllowed: boolean,
): EligibilityVerdict {
  return { state, labelKey, inviteAllowed, claimsMedicalClearance: false };
}

/**
 * Availability is advisory only: a donor marked available with an eligibility
 * restriction stays restricted. Returns `false` whenever eligibility blocks.
 */
export function mayInvite(
  eligibility: EligibilityVerdict,
  availability: "available" | "unavailable" | "paused" | "unknown",
  consentGiven: boolean,
): boolean {
  if (!consentGiven) return false;
  if (availability !== "available") return false;
  return eligibility.inviteAllowed;
}

/**
 * Whether a self-reported donation record may be shown as verified.
 * Self-reported records are never promoted by this frontend.
 */
export function isRecordVerified(
  verification: "self_reported" | "submitted" | "verified" | "rejected",
): boolean {
  return verification === "verified";
}
