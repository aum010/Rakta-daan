/**
 * Coordination domain types.
 *
 * These describe the frontend demonstration of emergency request coordination:
 * multi-donor commitments, sequential notification waves, private conversations
 * and facility confirmation.
 *
 * Everything here is LOCAL DEMO STATE. No backend decision is made here, and
 * nothing in this module sends a message, calls a service or records a real
 * donation. Production behaviour requires server-side state validation,
 * atomic allocation and idempotent writes — see
 * docs/frontend/multi-donor-allocation.md.
 */
import type { BloodComponent, BloodGroup, Urgency } from "@/lib/blood";

/* ------------------------------------------------------------------ *
 * Request lifecycle
 * ------------------------------------------------------------------ */

export const REQUEST_STATES = [
  "draft",
  "submitted",
  "searching",
  "partially_covered",
  "fully_committed",
  "awaiting_arrival",
  "donation_in_progress",
  "awaiting_confirmation",
  "fulfilled",
  "cancelled",
  "expired",
  "escalation_required",
] as const;

export type RequestState = (typeof REQUEST_STATES)[number];

/** No further invitations or acceptances are possible. */
export const TERMINAL_REQUEST_STATES: readonly RequestState[] = [
  "fulfilled",
  "cancelled",
  "expired",
];

export function isTerminal(state: RequestState): boolean {
  return TERMINAL_REQUEST_STATES.includes(state);
}

/**
 * Whether the requirement is currently closed to new commitments.
 * `fully_committed` is *not* terminal for tracking, but it stops invitations.
 */
export function acceptsNewCommitments(state: RequestState): boolean {
  return (
    state === "submitted" ||
    state === "searching" ||
    state === "partially_covered" ||
    state === "escalation_required"
  );
}

/* ------------------------------------------------------------------ *
 * Donor participation
 * ------------------------------------------------------------------ */

export const PARTICIPATION_STATES = [
  "invited",
  "declined",
  "accepted",
  "withdrawn",
  "arrived",
  "screened_out",
  "donated",
  "confirmed",
] as const;

export type ParticipationState = (typeof PARTICIPATION_STATES)[number];

/** Still counted toward the provisionally committed total. */
export const COMMITTING_STATES: readonly ParticipationState[] = [
  "accepted",
  "arrived",
  "donated",
  "confirmed",
];

/** Participation that can no longer contribute units. */
export const CLOSED_PARTICIPATION: readonly ParticipationState[] = [
  "declined",
  "withdrawn",
  "screened_out",
];

export function isCommitting(state: ParticipationState): boolean {
  return COMMITTING_STATES.includes(state);
}

export type Participation = {
  id: string;
  requestId: string;
  donorId: string;
  donorName: string;
  donorBloodGroup: BloodGroup;
  /** Approximate district-to-district distance. Never a home coordinate. */
  distanceKm: number | null;
  committedUnits: number;
  /** Always 0 until an authorised facility confirms the donation. */
  confirmedUnits: number;
  state: ParticipationState;
  invitedAt: string;
  respondedAt: string | null;
  arrivedAt: string | null;
  screenedAt: string | null;
  donatedAt: string | null;
  confirmedAt: string | null;
  updatedAt: string;
  withdrawalReason: string | null;
  /** Opt-in only. Never on by default. */
  sharingLiveLocation: boolean;
  liveLocationUpdatedAt: string | null;
  wave: number;
};

/* ------------------------------------------------------------------ *
 * Notification waves
 * ------------------------------------------------------------------ */

export type WaveConfig = {
  /** 1-based wave number. */
  index: number;
  labelKey: string;
  radiusKm: number;
  batchSize: number;
  responseWindowMinutes: number;
};

export type WaveState = {
  index: number;
  startedAt: string;
  endsAt: string;
  invited: number;
  responses: number;
  /** Set when the wave was superseded by the next one. */
  closedAt: string | null;
  escalated: boolean;
};

/* ------------------------------------------------------------------ *
 * Mock donor candidates
 * ------------------------------------------------------------------ */

export const CANDIDATE_AVAILABILITY = [
  "available",
  "unavailable",
  "paused",
  "unknown",
] as const;
export type CandidateAvailability = (typeof CANDIDATE_AVAILABILITY)[number];

/**
 * Eligibility is a *display* state, never a medical clearance. The frontend
 * must not convert a score into an assertion that someone may donate.
 */
export const ELIGIBILITY_STATES = [
  "unknown",
  "self_reported",
  "requires_review",
  "deferred",
  "awaiting_assessment",
  "assessment_expired",
  "eligible",
] as const;
export type EligibilityState = (typeof ELIGIBILITY_STATES)[number];

export type MockCandidate = {
  id: string;
  name: string;
  bloodGroup: BloodGroup;
  districtCode: string;
  /** Signed display name only — no phone number, no precise coordinates. */
  distanceKm: number;
  availability: CandidateAvailability;
  availabilityConfirmedDaysAgo: number;
  eligibility: EligibilityState;
  eligibilityReviewedDaysAgo: number;
  verification: "verified" | "pending" | "unverified";
  notificationChannels: Array<"sms" | "whatsapp" | "email">;
  acceptsAlerts: boolean;
  activeCommitments: number;
  /** Deterministic seed used to keep wave responses repeatable. */
  seed: number;
  /** Only true when the donor has explicitly switched it on for this request. */
  sharesLiveLocation: boolean;
};

export type CandidateExclusion =
  | "incompatible"
  | "unavailable"
  | "stale_availability"
  | "eligibility_not_approved"
  | "no_alert_consent"
  | "out_of_radius"
  | "already_involved"
  | "active_commitment_limit";

export type RankedCandidate = {
  candidate: MockCandidate;
  score: number;
  rank: number;
  distanceKm: number;
  excluded: CandidateExclusion | null;
};

/* ------------------------------------------------------------------ *
 * Coordination request (the demo aggregate)
 * ------------------------------------------------------------------ */

export type CoordinationRequest = {
  reference: string;
  state: RequestState;
  bloodGroup: BloodGroup;
  component: BloodComponent;
  unitsRequired: number;
  urgency: Urgency;
  hospital: string;
  hospitalLat: number;
  hospitalLng: number;
  districtCode: string;
  provinceCode: string;
  neededBy: string;
  requesterName: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  participants: Participation[];
  waves: WaveConfig[];
  waveHistory: WaveState[];
  activeWave: number;
  timeline: TimelineEvent[];
  /** Facility-confirmed fulfilment is what closes a request, not clicks. */
  confirmedUnits: number;
  cancelledAt: string | null;
  fulfilledAt: string | null;
};

export type TimelineKind =
  | "submitted"
  | "search_started"
  | "wave_started"
  | "candidate_invited"
  | "donor_accepted"
  | "donor_declined"
  | "donor_withdrawn"
  | "partially_covered"
  | "fully_covered"
  | "facility_confirmation"
  | "requirement_increased"
  | "wave_escalated"
  | "cancelled"
  | "fulfilled"
  | "expired"
  | "message_sent";

export type TimelineEvent = {
  at: string;
  kind: TimelineKind;
  /** Optional localisation key; the UI falls back to `kind`. */
  labelKey?: string;
  detail?: string;
};

/* ------------------------------------------------------------------ *
 * Conversations
 * ------------------------------------------------------------------ */

export const DEMO_CHANNELS = ["in_app", "phone", "whatsapp", "messenger", "viber", "sms"] as const;
export type DemoChannel = (typeof DEMO_CHANNELS)[number];

/** Which channels the prototype can honestly claim to support. */
export const CHANNEL_SUPPORT: Record<DemoChannel, "implemented" | "simulated" | "unavailable"> = {
  in_app: "implemented",
  phone: "simulated",
  whatsapp: "unavailable",
  messenger: "unavailable",
  viber: "unavailable",
  sms: "unavailable",
};

export type ConversationMessage = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  at: string;
  quickReply?: boolean;
  /** Prototype only — nothing leaves this browser. */
  delivery: "sent" | "simulated";
};

export type Conversation = {
  id: string;
  requestId: string;
  participantId: string;
  messages: ConversationMessage[];
  /** Contact details stay hidden until the owner consents to disclosure. */
  contactDisclosed: boolean;
  blocked: boolean;
  updatedAt: string;
};

/* ------------------------------------------------------------------ *
 * Location consent — four separate purposes
 * ------------------------------------------------------------------ */

export type LocationPurpose =
  | "requester_discovery"
  | "donor_matching"
  | "donor_live"
  | "requester_live";

export type LocationConsent = Record<LocationPurpose, boolean>;

export type LocationChoice = {
  provinceCode: string;
  districtCode: string;
  municipality: string;
  area: string;
  hospital: string;
  lat: number | null;
  lng: number | null;
  source: "manual" | "device" | "map_pin";
  accuracyNote?: string;
};

/* ------------------------------------------------------------------ *
 * Donor profile extras (history + eligibility)
 * ------------------------------------------------------------------ */

export type DonationRecord = {
  id: string;
  date: string;
  component: BloodComponent;
  facility: string;
  verification: "self_reported" | "submitted" | "verified" | "rejected";
  source: string;
  updatedAt: string;
  verificationRef: string | null;
};
