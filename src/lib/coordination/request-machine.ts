/**
 * Request state machine and unit-allocation rules.
 *
 * Pure functions over local demo state — no I/O, no timers, no messaging.
 * Keeping them pure is what makes the acceptance criteria in §11 and §24 of the
 * brief testable.
 *
 * Key invariants this module enforces:
 *  1. A request is only `fulfilled` after facility confirmation covers the
 *     requirement. Provisional commitments never produce `fulfilled`.
 *  2. Once the requirement is covered, invitations for the covered quantity
 *     stop and existing acceptances are refused.
 *  3. Withdrawal or facility rejection reopens exactly the withdrawn quantity
 *     and resumes matching for it.
 *  4. Cancelled/expired requests refuse new commitments.
 */
import type {
  CoordinationRequest,
  Participation,
  ParticipationState,
  RequestState,
  TimelineEvent,
} from "./types";
import { isCommitting, isTerminal } from "./types";

export type Allocation = {
  unitsRequired: number;
  /** Sum of committed units from donors still committing. */
  unitsCommitted: number;
  /** Sum of facility-confirmed units. Always ≤ unitsCommitted. */
  unitsConfirmed: number;
  /** unitsRequired − unitsCommitted (never negative). */
  unitsUncommitted: number;
  /** unitsRequired − unitsConfirmed (never negative). */
  unitsUnconfirmed: number;
  donorsAccepted: number;
  donorsArrived: number;
  donorsConfirmed: number;
  /** True when every required unit has a provisional commitment. */
  fullyCommitted: boolean;
  /** True when every required unit has been confirmed by the facility. */
  fullyConfirmed: boolean;
};

export function computeAllocation(request: CoordinationRequest): Allocation {
  const committing = request.participants.filter((p) => isCommitting(p.state));
  const unitsCommitted = committing.reduce((sum, p) => sum + p.committedUnits, 0);
  const unitsConfirmed = request.participants.reduce((sum, p) => sum + p.confirmedUnits, 0);

  const unitsRequired = request.unitsRequired;

  return {
    unitsRequired,
    unitsCommitted: Math.min(unitsCommitted, unitsRequired),
    unitsConfirmed: Math.min(unitsConfirmed, unitsRequired),
    unitsUncommitted: Math.max(0, unitsRequired - unitsCommitted),
    unitsUnconfirmed: Math.max(0, unitsRequired - unitsConfirmed),
    donorsAccepted: committing.length,
    donorsArrived: committing.filter((p) => p.state === "arrived" || p.state === "donated").length,
    donorsConfirmed: request.participants.filter((p) => p.state === "confirmed").length,
    fullyCommitted: unitsCommitted >= unitsRequired,
    fullyConfirmed: unitsConfirmed >= unitsRequired,
  };
}

/* ------------------------------------------------------------------ *
 * Transitions
 * ------------------------------------------------------------------ */

const ALLOWED: Record<RequestState, readonly RequestState[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["searching", "cancelled", "expired"],
  searching: ["partially_covered", "fully_committed", "escalation_required", "cancelled", "expired"],
  partially_covered: [
    "searching",
    "fully_committed",
    "awaiting_arrival",
    "escalation_required",
    "cancelled",
    "expired",
  ],
  fully_committed: ["awaiting_arrival", "partially_covered", "searching", "cancelled", "expired"],
  awaiting_arrival: ["donation_in_progress", "partially_covered", "searching", "cancelled", "expired"],
  donation_in_progress: ["awaiting_confirmation", "partially_covered", "cancelled", "expired"],
  awaiting_confirmation: ["fulfilled", "partially_covered", "cancelled", "expired"],
  fulfilled: [],
  cancelled: [],
  expired: [],
  escalation_required: ["searching", "partially_covered", "fully_committed", "cancelled", "expired"],
};

export function canTransition(from: RequestState, to: RequestState): boolean {
  return ALLOWED[from].includes(to);
}

export function isValidTransition(from: RequestState, to: RequestState): boolean {
  if (from === to) return true;
  if (isTerminal(from)) return false;
  return canTransition(from, to);
}

/**
 * Derives the request state from its participants and confirmed units.
 *
 * `facilityStage` reflects what the (simulated) facility has reported, so the
 * derived state never claims fulfilment on donor clicks alone.
 */
export function deriveRequestState(
  request: Pick<CoordinationRequest, "participants" | "unitsRequired" | "confirmedUnits">,
  facilityStage: "none" | "arrived" | "in_progress" | "confirmed" = "none",
): RequestState {
  const allocation = computeAllocation(request as CoordinationRequest);

  if (allocation.fullyConfirmed) return "fulfilled";
  if (allocation.fullyCommitted) {
    // Facility stages only move the request forward. Fulfilment is reserved
    // for the fullyConfirmed branch above — one confirmation out of three is
    // never a fulfilled request.
    if (facilityStage === "in_progress") return "donation_in_progress";
    if (facilityStage === "arrived") return "awaiting_arrival";
    return "fully_committed";
  }
  if (allocation.unitsCommitted > 0) return "partially_covered";
  return "searching";
}

/* ------------------------------------------------------------------ *
 * Participation actions
 * ------------------------------------------------------------------ */

export type ActionOutcome =
  | { ok: true; request: CoordinationRequest }
  | { ok: false; code: ActionErrorCode; request: CoordinationRequest };

export type ActionErrorCode =
  | "request_terminal"
  | "requirement_covered"
  | "already_involved"
  | "unknown_participant"
  | "invalid_state"
  | "requirement_increased";

function pushTimeline(request: CoordinationRequest, event: TimelineEvent): CoordinationRequest {
  return { ...request, timeline: [...request.timeline, event], updatedAt: event.at };
}

function withState(request: CoordinationRequest, state: RequestState, at: string): CoordinationRequest {
  if (request.state === state) return request;
  return { ...request, state, updatedAt: at };
}

/**
 * A donor accepts an invitation for a quantity of units.
 *
 * Refuses when the requirement is already covered — this is the local
 * duplicate-acceptance guard described in §11 of the brief. It is a UI-level
 * guard only; production needs server-side atomic allocation.
 */
export function acceptInvitation(
  request: CoordinationRequest,
  participantId: string,
  now: Date,
  units = 1,
): ActionOutcome {
  if (isTerminal(request.state)) {
    return { ok: false, code: "request_terminal", request };
  }
  const existing = request.participants.find((p) => p.id === participantId);
  if (!existing) return { ok: false, code: "unknown_participant", request };

  const allocation = computeAllocation(request);
  if (allocation.unitsCommitted + units > request.unitsRequired) {
    return { ok: false, code: "requirement_covered", request };
  }
  if (existing.state === "accepted" || isCommitting(existing.state)) {
    return { ok: false, code: "already_involved", request };
  }
  if (existing.state !== "invited") {
    return { ok: false, code: "invalid_state", request };
  }

  const at = now.toISOString();
  const participants = request.participants.map((p) =>
    p.id === participantId
      ? {
          ...p,
          state: "accepted" as ParticipationState,
          committedUnits: units,
          respondedAt: at,
          updatedAt: at,
        }
      : p,
  );

  let next: CoordinationRequest = { ...request, participants };
  const after = computeAllocation(next);

  next = pushTimeline(next, { at, kind: "donor_accepted", detail: `${units}` });

  if (after.fullyCommitted) {
    next = pushTimeline(next, { at, kind: "fully_covered" });
    next = withState(next, "fully_committed", at);
  } else {
    next = withState(next, "partially_covered", at);
  }
  return { ok: true, request: next };
}

export function declineInvitation(
  request: CoordinationRequest,
  participantId: string,
  now: Date,
): ActionOutcome {
  if (isTerminal(request.state)) {
    return { ok: false, code: "request_terminal", request };
  }
  const existing = request.participants.find((p) => p.id === participantId);
  if (!existing) return { ok: false, code: "unknown_participant", request };
  if (existing.state !== "invited") {
    return { ok: false, code: "invalid_state", request };
  }

  const at = now.toISOString();
  const participants = request.participants.map((p) =>
    p.id === participantId
      ? { ...p, state: "declined" as ParticipationState, respondedAt: at, updatedAt: at, committedUnits: 0 }
      : p,
  );

  let next = pushTimeline({ ...request, participants }, {
    at,
    kind: "donor_declined",
  });
  next = withState(next, deriveRequestState(next), at);
  return { ok: true, request: next };
}

/**
 * Donor withdrawal or facility rejection after screening.
 *
 * Recalculates the uncovered requirement and resumes matching for it. The
 * facility-rejection path never carries screening reasons — only that the
 * requirement reopened (§10 of the brief).
 */
export function withdrawParticipation(
  request: CoordinationRequest,
  participantId: string,
  now: Date,
  options: { reason?: string; byFacility?: boolean } = {},
): ActionOutcome {
  if (isTerminal(request.state)) {
    return { ok: false, code: "request_terminal", request };
  }
  const existing = request.participants.find((p) => p.id === participantId);
  if (!existing) return { ok: false, code: "unknown_participant", request };
  if (!isCommitting(existing.state) && existing.state !== "accepted") {
    return { ok: false, code: "invalid_state", request };
  }

  const at = now.toISOString();
  const nextState: ParticipationState = options.byFacility ? "screened_out" : "withdrawn";

  const participants = request.participants.map((p) =>
    p.id === participantId
      ? {
          ...p,
          state: nextState,
          committedUnits: 0,
          confirmedUnits: 0,
          updatedAt: at,
          withdrawalReason: options.byFacility ? null : (options.reason ?? "donor_withdrew"),
          sharingLiveLocation: false,
        }
      : p,
  );

  let next: CoordinationRequest = { ...request, participants };
  next = pushTimeline(next, {
    at,
    kind: options.byFacility ? "facility_confirmation" : "donor_withdrawn",
    labelKey: options.byFacility ? "requirement_reopened" : "donor_withdrawn",
  });

  // Resume matching for the uncovered quantity.
  const after = computeAllocation(next);
  const target = after.fullyCommitted
    ? "fully_committed"
    : after.unitsCommitted > 0
      ? "partially_covered"
      : "searching";
  next = withState(next, target, at);
  return { ok: true, request: next };
}

/* ------------------------------------------------------------------ *
 * Facility confirmation
 * ------------------------------------------------------------------ */

export function recordFacilityConfirmation(
  request: CoordinationRequest,
  participantId: string,
  units: number,
  now: Date,
): ActionOutcome {
  if (isTerminal(request.state)) {
    return { ok: false, code: "request_terminal", request };
  }
  const existing = request.participants.find((p) => p.id === participantId);
  if (!existing) return { ok: false, code: "unknown_participant", request };
  if (existing.state !== "donated" && existing.state !== "arrived" && existing.state !== "confirmed") {
    return { ok: false, code: "invalid_state", request };
  }

  const at = now.toISOString();
  const granted = Math.min(units, existing.committedUnits);
  const participants = request.participants.map((p) =>
    p.id === participantId
      ? {
          ...p,
          state: "confirmed" as ParticipationState,
          confirmedUnits: (p.confirmedUnits ?? 0) + granted,
          confirmedAt: at,
          updatedAt: at,
        }
      : p,
  );

  let next: CoordinationRequest = {
    ...request,
    participants,
    confirmedUnits: request.confirmedUnits + granted,
  };

  next = pushTimeline(next, {
    at,
    kind: "facility_confirmation",
    detail: `${granted}`,
  });

  const after = computeAllocation(next);
  if (after.fullyConfirmed) {
    next = pushTimeline(next, { at, kind: "fulfilled" });
    next = { ...next, state: "fulfilled", fulfilledAt: at, updatedAt: at };
  } else {
    next = withState(next, deriveRequestState(next, "confirmed"), at);
  }
  return { ok: true, request: next };
}

export function markArrived(
  request: CoordinationRequest,
  participantId: string,
  now: Date,
): ActionOutcome {
  const existing = request.participants.find((p) => p.id === participantId);
  if (!existing) return { ok: false, code: "unknown_participant", request };
  if (existing.state !== "accepted") return { ok: false, code: "invalid_state", request };
  if (isTerminal(request.state)) return { ok: false, code: "request_terminal", request };

  const at = now.toISOString();
  const participants = request.participants.map((p) =>
    p.id === participantId
      ? { ...p, state: "arrived" as ParticipationState, arrivedAt: at, updatedAt: at }
      : p,
  );
  let next = { ...request, participants };
  next = withState(next, deriveRequestState(next, "arrived"), at);
  return { ok: true, request: next };
}

export function markDonated(
  request: CoordinationRequest,
  participantId: string,
  now: Date,
): ActionOutcome {
  const existing = request.participants.find((p) => p.id === participantId);
  if (!existing) return { ok: false, code: "unknown_participant", request };
  if (existing.state !== "arrived") return { ok: false, code: "invalid_state", request };
  if (isTerminal(request.state)) return { ok: false, code: "request_terminal", request };

  const at = now.toISOString();
  const participants = request.participants.map((p) =>
    p.id === participantId
      ? { ...p, state: "donated" as ParticipationState, donatedAt: at, updatedAt: at }
      : p,
  );
  let next = { ...request, participants };
  next = withState(next, deriveRequestState(next, "in_progress"), at);
  return { ok: true, request: next };
}

/* ------------------------------------------------------------------ *
 * Closure and requirement changes
 * ------------------------------------------------------------------ */

export function cancelRequest(
  request: CoordinationRequest,
  now: Date,
  reason = "requester_cancelled",
): ActionOutcome {
  if (request.state === "fulfilled" || request.state === "cancelled") {
    return { ok: false, code: "invalid_state", request };
  }
  const at = now.toISOString();
  // Outstanding invitations close; no new mock acceptances are possible.
  const participants = request.participants.map((p) =>
    p.state === "invited"
      ? { ...p, state: "withdrawn" as ParticipationState, updatedAt: at, withdrawalReason: "request_cancelled" }
      : p,
  );
  let next: CoordinationRequest = {
    ...request,
    participants,
    state: "cancelled",
    cancelledAt: at,
    updatedAt: at,
  };
  next = pushTimeline(next, { at, kind: "cancelled", detail: reason });
  return { ok: true, request: next };
}

export function expireRequest(request: CoordinationRequest, now: Date): ActionOutcome {
  if (isTerminal(request.state)) return { ok: false, code: "request_terminal", request };
  const at = now.toISOString();
  const participants = request.participants.map((p) =>
    p.state === "invited"
      ? { ...p, state: "withdrawn" as ParticipationState, updatedAt: at, withdrawalReason: "request_expired" }
      : p,
  );
  let next: CoordinationRequest = {
    ...request,
    participants,
    state: "expired",
    updatedAt: at,
  };
  next = pushTimeline(next, { at, kind: "expired" });
  return { ok: true, request: next };
}

/**
 * Increasing the requirement reopens matching for the *additional* quantity
 * only — existing commitments stay valid.
 */
export function increaseRequirement(
  request: CoordinationRequest,
  units: number,
  now: Date,
): ActionOutcome {
  if (isTerminal(request.state)) return { ok: false, code: "request_terminal", request };
  if (units <= request.unitsRequired) {
    return { ok: false, code: "requirement_increased", request };
  }
  const at = now.toISOString();
  let next: CoordinationRequest = {
    ...request,
    unitsRequired: units,
    updatedAt: at,
  };
  next = pushTimeline(next, { at, kind: "requirement_increased", detail: `${units}` });
  next = withState(next, deriveRequestState(next), at);
  return { ok: true, request: next };
}

/* ------------------------------------------------------------------ *
 * Invitation eligibility
 * ------------------------------------------------------------------ */

/**
 * Whether an outstanding invitation may still be accepted. Used by the UI to
 * disable actions *and* by tests to assert the closure rules.
 */
export function invitationAcceptable(
  request: CoordinationRequest,
  participant: Participation,
): { acceptable: boolean; reason?: ActionErrorCode } {
  if (isTerminal(request.state)) return { acceptable: false, reason: "request_terminal" };
  if (participant.state === "declined" || participant.state === "withdrawn") {
    return { acceptable: false, reason: "invalid_state" };
  }
  if (participant.state !== "invited") {
    return { acceptable: false, reason: "already_involved" };
  }
  const allocation = computeAllocation(request);
  if (allocation.unitsCommitted >= request.unitsRequired) {
    return { acceptable: false, reason: "requirement_covered" };
  }
  return { acceptable: true };
}
