/**
 * Sequential notification waves and deterministic candidate ranking.
 *
 * Frontend demonstration only. The future backend owns the authoritative
 * matching decision, the send itself, and any rate limiting. Nothing here
 * dispatches a notification — `waveHistory` records what *would* have been
 * sent so the interface can show progress honestly.
 *
 * Design constraints from the brief (§9):
 *  - Ranking uses only legitimate criteria: compatibility, availability,
 *    eligibility freshness, distance, notification preference, active
 *    commitments, urgency. No demographic or discriminatory factors.
 *  - Distance is a straight-line proxy, never presented as travel time.
 *  - A score is never treated as a medical clearance.
 *  - Response windows are configurable per wave, not hard-coded universally.
 */
import { canDonateTo, supportsCompatibilityMatching } from "@/lib/blood";
import { computeAllocation, deriveRequestState } from "./request-machine";
import { DEFAULT_WAVE_PLAN, WAVE_RESPONSE_RATE } from "./wave-config";
import type {
  CandidateExclusion,
  CoordinationRequest,
  MockCandidate,
  RankedCandidate,
  TimelineEvent,
  WaveConfig,
  WaveState,
} from "./types";

/* ------------------------------------------------------------------ *
 * Ranking
 * ------------------------------------------------------------------ */

export type RankOptions = {
  radiusKm: number;
  now?: Date;
  /** Donor ids already invited or participating in this request. */
  involved?: ReadonlySet<string>;
  urgencyWeight?: number;
};

const MAX_ACTIVE_COMMITMENTS = 2;

/**
 * Evaluates one candidate. `excluded` is non-null when the candidate must not
 * be invited; the score of an excluded candidate is 0.
 */
export function evaluateCandidate(
  candidate: MockCandidate,
  request: Pick<CoordinationRequest, "bloodGroup" | "component" | "urgency">,
  options: RankOptions,
): { score: number; excluded: CandidateExclusion | null; distanceKm: number } {
  const distanceKm = candidate.distanceKm;

  if (!supportsCompatibilityMatching(request.component)) {
    // We do not claim platelet/plasma compatibility — exclude rather than guess.
    return { score: 0, excluded: "incompatible", distanceKm };
  }
  if (!canDonateTo(candidate.bloodGroup, request.bloodGroup)) {
    return { score: 0, excluded: "incompatible", distanceKm };
  }
  if (options.involved?.has(candidate.id)) {
    return { score: 0, excluded: "already_involved", distanceKm };
  }
  if (candidate.availability !== "available") {
    return { score: 0, excluded: "unavailable", distanceKm };
  }
  if (candidate.availabilityConfirmedDaysAgo > 30) {
    return { score: 0, excluded: "stale_availability", distanceKm };
  }
  // Unknown / deferred / expired eligibility is never presented as approved.
  if (candidate.eligibility !== "eligible" && candidate.eligibility !== "self_reported") {
    return { score: 0, excluded: "eligibility_not_approved", distanceKm };
  }
  if (!candidate.acceptsAlerts) {
    return { score: 0, excluded: "no_alert_consent", distanceKm };
  }
  if (distanceKm > options.radiusKm) {
    return { score: 0, excluded: "out_of_radius", distanceKm };
  }
  if (candidate.activeCommitments >= MAX_ACTIVE_COMMITMENTS) {
    return { score: 0, excluded: "active_commitment_limit", distanceKm };
  }

  let score = 40;
  if (distanceKm <= 5) score += 28;
  else if (distanceKm <= 15) score += 22;
  else if (distanceKm <= 30) score += 15;
  else if (distanceKm <= 60) score += 8;
  else score += 3;

  if (candidate.availabilityConfirmedDaysAgo <= 2) score += 12;
  else if (candidate.availabilityConfirmedDaysAgo <= 7) score += 8;
  else score += 3;

  if (candidate.eligibility === "eligible") score += 10;
  else if (candidate.eligibility === "self_reported") score += 4;

  if (candidate.verification === "verified") score += 6;
  else if (candidate.verification === "pending") score += 2;

  if (candidate.activeCommitments === 0) score += 5;

  const urgencyBoost =
    request.urgency === "critical" ? 8 : request.urgency === "urgent" ? 5 : 2;
  score += urgencyBoost;

  return { score, excluded: null, distanceKm };
}

/**
 * Deterministic ranking: score descending, ties broken by distance, then id.
 * Stable ordering keeps wave composition repeatable across renders and tests.
 */
export function rankCandidates(
  candidates: readonly MockCandidate[],
  request: Pick<CoordinationRequest, "bloodGroup" | "component" | "urgency">,
  options: RankOptions,
): RankedCandidate[] {
  const evaluated = candidates.map((candidate) => ({
    candidate,
    ...evaluateCandidate(candidate, request, options),
  }));

  const eligible = evaluated
    .filter((row) => row.excluded === null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return a.candidate.id.localeCompare(b.candidate.id);
    });

  const excluded = evaluated
    .filter((row) => row.excluded !== null)
    .sort((a, b) => a.candidate.id.localeCompare(b.candidate.id));

  return [
    ...eligible.map((row, index) => ({ ...row, rank: index + 1 })),
    ...excluded.map((row) => ({ ...row, rank: 0 })),
  ];
}

export function eligibleOnly(ranked: readonly RankedCandidate[]): MockCandidate[] {
  return ranked.filter((row) => row.excluded === null).map((row) => row.candidate);
}

/* ------------------------------------------------------------------ *
 * Wave progression
 * ------------------------------------------------------------------ */

export function defaultWavePlan(): WaveConfig[] {
  return DEFAULT_WAVE_PLAN.map((wave) => ({ ...wave }));
}

export function waveForIndex(plan: readonly WaveConfig[], index: number): WaveConfig | null {
  return plan.find((wave) => wave.index === index) ?? null;
}

export function lastWaveIndex(plan: readonly WaveConfig[]): number {
  return plan.reduce((max, wave) => Math.max(max, wave.index), 1);
}

export function startWave(
  request: CoordinationRequest,
  index: number,
  now: Date,
): { ok: true; request: CoordinationRequest } | { ok: false; code: string } {
  const config = waveForIndex(request.waves, index);
  if (!config) return { ok: false, code: "unknown_wave" };
  if (request.state === "fulfilled" || request.state === "cancelled" || request.state === "expired") {
    return { ok: false, code: "request_terminal" };
  }
  // Do not restart a wave that is still open.
  const open = request.waveHistory.find(
    (wave) => wave.index === index && wave.closedAt === null,
  );
  if (open) return { ok: false, code: "wave_already_open" };

  const startedAt = now.toISOString();
  const endsAt = new Date(now.getTime() + config.responseWindowMinutes * 60_000).toISOString();

  const previous = request.waveHistory.map((wave) =>
    wave.closedAt === null ? { ...wave, closedAt: startedAt } : wave,
  );

  const state: WaveState = {
    index,
    startedAt,
    endsAt,
    invited: 0,
    responses: 0,
    closedAt: null,
    escalated: index >= lastWaveIndex(request.waves),
  };

  const at = startedAt;
  const timeline = [
    ...request.timeline,
    {
      at,
      kind: "wave_started" as const,
      detail: String(index),
    },
    ...(index > 1 ? [{ at, kind: "wave_escalated" as const, detail: String(index) }] : []),
  ];

  const next: CoordinationRequest = {
    ...request,
    waveHistory: [...previous, state],
    activeWave: index,
    timeline,
    updatedAt: at,
    state:
      request.state === "submitted" || request.state === "draft" ? "searching" : request.state,
  };

  return { ok: true, request: next };
}

export function recordInvitation(request: CoordinationRequest, waveIndex: number, now: Date) {
  const at = now.toISOString();
  return {
    ...request,
    waveHistory: request.waveHistory.map((wave) =>
      wave.index === waveIndex && wave.closedAt === null
        ? { ...wave, invited: wave.invited + 1 }
        : wave,
    ),
    timeline: [
      ...request.timeline,
      { at, kind: "candidate_invited" as const, detail: String(waveIndex) },
    ],
    updatedAt: at,
  };
}

export function recordResponse(request: CoordinationRequest, waveIndex: number, now: Date) {
  const at = now.toISOString();
  return {
    ...request,
    waveHistory: request.waveHistory.map((wave) =>
      wave.index === waveIndex && wave.closedAt === null
        ? { ...wave, responses: wave.responses + 1 }
        : wave,
    ),
    updatedAt: at,
  };
}

export type WaveProgress = {
  wave: WaveState | null;
  config: WaveConfig | null;
  isLastWave: boolean;
  msRemaining: number;
  open: boolean;
};

export function currentWaveProgress(request: CoordinationRequest, now: Date): WaveProgress {
  const wave =
    [...request.waveHistory].reverse().find((entry) => entry.closedAt === null) ?? null;
  const config = wave ? waveForIndex(request.waves, wave.index) : null;
  const msRemaining = wave ? Math.max(0, new Date(wave.endsAt).getTime() - now.getTime()) : 0;
  return {
    wave,
    config,
    isLastWave: wave ? wave.index >= lastWaveIndex(request.waves) : false,
    msRemaining,
    open: Boolean(wave),
  };
}

/**
 * Whether the next wave should start: the current window has elapsed (or the
 * batch is exhausted) and the requirement is still uncovered.
 */
export function shouldAdvanceWave(request: CoordinationRequest, now: Date): boolean {
  const allocation = computeAllocation(request);
  if (allocation.fullyCommitted || allocation.fullyConfirmed) return false;
  if (request.state === "cancelled" || request.state === "expired" || request.state === "fulfilled") {
    return false;
  }
  const progress = currentWaveProgress(request, now);
  if (!progress.wave || !progress.config) return true;
  if (progress.wave.index >= lastWaveIndex(request.waves)) return false;
  return progress.msRemaining <= 0;
}

/**
 * How many candidates the current wave should invite: the smaller of the wave
 * batch size and the units still uncommitted (never invite for covered units).
 */
export function inviteBatchSize(request: CoordinationRequest): number {
  const allocation = computeAllocation(request);
  if (allocation.unitsUncommitted <= 0) return 0;
  const config = waveForIndex(request.waves, request.activeWave);
  const batch = config?.batchSize ?? 0;
  return Math.min(batch, Math.max(allocation.unitsUncommitted, 1));
}

/** Stable 0–1 hash so repeated simulations produce the same outcome. */
function hash01(text: string): number {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(index)) >>> 0;
  }
  return hash / 0xffffffff;
}

/**
 * Simulates how the invited donors of the current wave respond.
 *
 * This is a FRONTEND DEMONSTRATION of the response step: nobody is messaged,
 * and the accept/decline decision is a deterministic function of the
 * participation id, so replaying a wave always produces the same outcome.
 * A wave never ends with *every* invitee declining while a response rate
 * exists, so the coordination flow can always be demonstrated. Real
 * acceptance must come from the donor through a server-validated action.
 */
export function simulateWaveResponses(
  request: CoordinationRequest,
  now: Date,
): CoordinationRequest {
  const waveIndex = request.activeWave;
  const rate = WAVE_RESPONSE_RATE[waveIndex] ?? 50;
  const at = now.toISOString();
  const invited = request.participants.filter(
    (participant) => participant.state === "invited" && participant.wave === waveIndex,
  );
  if (invited.length === 0) return request;

  const outcomes = new Map<string, boolean>();
  let acceptedCount = 0;
  for (const participant of invited) {
    const accepted = hash01(`${participant.id}:${waveIndex}:${request.reference}`) * 100 < rate;
    outcomes.set(participant.id, accepted);
    if (accepted) acceptedCount += 1;
  }
  // Never demonstrate a total no-response wave: promote the first invitee.
  const first = invited[0];
  if (acceptedCount === 0 && rate > 0 && first) {
    outcomes.set(first.id, true);
    acceptedCount = 1;
  }

  const participants = request.participants.map((participant) => {
    const accepted = outcomes.get(participant.id);
    if (accepted === undefined) return participant;
    return accepted
      ? {
          ...participant,
          state: "accepted" as const,
          respondedAt: at,
          updatedAt: at,
          committedUnits: Math.max(1, participant.committedUnits),
        }
      : {
          ...participant,
          state: "declined" as const,
          respondedAt: at,
          updatedAt: at,
        };
  });

  const events: TimelineEvent[] = invited.map((participant) => ({
    at,
    kind: outcomes.get(participant.id) ? "donor_accepted" : "donor_declined",
    detail: participant.donorName,
  }));

  const responses = invited.length;
  const withResponses: CoordinationRequest = {
    ...request,
    participants,
    timeline: [...request.timeline, ...events],
    updatedAt: at,
    waveHistory: request.waveHistory.map((wave) =>
      wave.index === waveIndex && wave.closedAt === null
        ? { ...wave, responses: wave.responses + responses }
        : wave,
    ),
  };

  const derived = deriveRequestState(withResponses);
  return { ...withResponses, state: derived, updatedAt: at };
}


