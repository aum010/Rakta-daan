import { Badge, type BadgeTone } from "@/components/ui/ui";
import { format } from "@/lib/i18n";
import type { Dictionary } from "@/messages/en";
import type {
  CandidateAvailability,
  CandidateExclusion,
  EligibilityState,
  ParticipationState,
  RequestState,
  TimelineKind,
} from "@/lib/coordination/types";

/**
 * Presentation-only mapping from coordination states to badge tones.
 * The labels themselves come from the dictionary so both locales stay in sync.
 */
const REQUEST_TONE: Record<RequestState, BadgeTone> = {
  draft: "neutral",
  submitted: "info",
  searching: "info",
  partially_covered: "amber",
  fully_committed: "teal",
  awaiting_arrival: "teal",
  donation_in_progress: "brand",
  awaiting_confirmation: "amber",
  fulfilled: "teal",
  cancelled: "neutral",
  expired: "neutral",
  escalation_required: "danger",
};

const PARTICIPATION_TONE: Record<ParticipationState, BadgeTone> = {
  invited: "info",
  declined: "neutral",
  accepted: "teal",
  withdrawn: "neutral",
  arrived: "teal",
  screened_out: "amber",
  donated: "brand",
  confirmed: "teal",
};

export function RequestStateBadge({
  state,
  dict,
}: {
  state: RequestState;
  dict: Dictionary;
}) {
  return <Badge tone={REQUEST_TONE[state]}>{dict.coord.request.state[state]}</Badge>;
}

export function ParticipationBadge({
  state,
  dict,
}: {
  state: ParticipationState;
  dict: Dictionary;
}) {
  return <Badge tone={PARTICIPATION_TONE[state]}>{dict.coord.request.participation[state]}</Badge>;
}

/** Display-only eligibility wording — never a medical clearance. */
export function eligibilityLabel(state: EligibilityState, dict: Dictionary): string {
  switch (state) {
    case "unknown":
      return dict.coord.donor.eligUnknown;
    case "self_reported":
      return dict.coord.donor.eligSelfReported;
    case "requires_review":
      return dict.coord.donor.eligRequiresReview;
    case "deferred":
      return dict.coord.donor.eligDeferred;
    case "awaiting_assessment":
      return dict.coord.donor.eligAwaiting;
    case "assessment_expired":
      return dict.coord.donor.eligExpired;
    case "eligible":
      return dict.coord.donor.eligEligible;
  }
}

/** Why a candidate was not asked, in the active locale. */
export function exclusionLabel(reason: CandidateExclusion, dict: Dictionary): string {
  switch (reason) {
    case "incompatible":
      return dict.coord.candidates.reasonIncompatible;
    case "unavailable":
      return dict.coord.candidates.reasonUnavailable;
    case "stale_availability":
      return dict.coord.candidates.reasonStale;
    case "eligibility_not_approved":
      return dict.coord.candidates.reasonEligibility;
    case "no_alert_consent":
      return dict.coord.candidates.reasonConsent;
    case "out_of_radius":
      return dict.coord.candidates.reasonRadius;
    case "already_involved":
      return dict.coord.candidates.reasonInvolved;
    case "active_commitment_limit":
      return dict.coord.candidates.reasonCommitment;
  }
}

/** Availability wording, including the honest "unknown" state. */
export function candidateAvailabilityLabel(
  availability: CandidateAvailability,
  dict: Dictionary,
): string {
  switch (availability) {
    case "available":
      return dict.donor.available;
    case "unavailable":
      return dict.donor.unavailable;
    case "paused":
      return dict.donor.paused;
    case "unknown":
      return dict.coord.candidates.availUnknown;
  }
}

/** District-level distance in the active locale's unit label. */
export function distanceLabel(km: number | null, dict: Dictionary): string {
  if (km === null) return "—";
  return `${Math.round(km * 10) / 10} ${dict.common.km}`;
}

/** Distance phrasing reused across map, candidate and participant cards. */
export function distanceText(km: number, dict: Dictionary): string {
  return format(dict.coord.candidates.distance, { km: Math.round(km * 10) / 10 });
}

/**
 * Localised timeline wording. `detail` carries the value each event needs
 * (wave index, donor name, unit count); the UI decides what it is before
 * calling, so no event renders as a raw key.
 */
export function timelineLabel(
  event: { kind: TimelineKind; detail?: string },
  dict: Dictionary,
): string {
  const detail = event.detail ?? "";
  const labels = dict.coord.request.timeline;
  const hasName = detail.length > 0 && Number.isNaN(Number(detail));
  /** Parsed unit count, defaulting to one when the event carries no detail. */
  const units = detail.length > 0 && !Number.isNaN(Number(detail)) ? Number(detail) : 1;
  switch (event.kind) {
    case "wave_started":
      return format(labels.wave_started, { index: detail });
    case "candidate_invited":
      return format(labels.candidate_invited, { count: detail });
    case "donor_accepted":
      return hasName
        ? format(labels.donor_accepted, { name: detail })
        : format(units === 1 ? labels.donor_accepted_units_one : labels.donor_accepted_units, {
            count: units,
          });
    case "donor_declined":
      return hasName
        ? format(labels.donor_declined, { name: detail })
        : labels.donor_declined_generic;
    case "donor_withdrawn":
      return hasName
        ? format(labels.donor_withdrawn, { name: detail })
        : labels.donor_withdrawn_generic;
    case "facility_confirmation":
      return format(units === 1 ? labels.facility_confirmation_one : labels.facility_confirmation, {
        count: units,
      });
    case "requirement_increased":
      return format(labels.requirement_increased, { count: detail });
    case "submitted":
      return labels.submitted;
    case "search_started":
      return labels.search_started;
    case "partially_covered":
      return labels.partially_covered;
    case "fully_covered":
      return labels.fully_covered;
    case "wave_escalated":
      return labels.wave_escalated;
    case "cancelled":
      return labels.cancelled;
    case "fulfilled":
      return labels.fulfilled;
    case "expired":
      return labels.expired;
    case "message_sent":
      return labels.message_sent;
  }
}
