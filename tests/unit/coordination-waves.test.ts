import { describe, expect, it } from "vitest";
import {
  eligibleOnly,
  evaluateCandidate,
  rankCandidates,
  inviteBatchSize,
  shouldAdvanceWave,
  startWave,
  currentWaveProgress,
  simulateWaveResponses,
} from "@/lib/coordination/waves";
import { MOCK_CANDIDATES, candidateById } from "@/lib/coordination/candidates";
import { acceptInvitation } from "@/lib/coordination/request-machine";
import { buildEmergencyScenario } from "@/lib/coordination/scenarios";
import type { MockCandidate } from "@/lib/coordination/types";

const NOW = new Date("2026-10-27T06:05:00.000Z"); // inside scenario wave 1's window
const REQUEST = { bloodGroup: "O_POS" as const, component: "whole_blood" as const, urgency: "urgent" as const };

function candidate(id: string): MockCandidate {
  const found = candidateById(id);
  if (!found) throw new Error(`missing fixture ${id}`);
  return found;
}

describe("candidate evaluation", () => {
  it("excludes incompatible blood groups", () => {
    const result = evaluateCandidate(candidate("cand-04"), REQUEST, { radiusKm: 75 });
    expect(result.excluded).toBe("incompatible");
    expect(result.score).toBe(0);
  });

  it("excludes candidates who are not available", () => {
    const result = evaluateCandidate(candidate("cand-07"), REQUEST, { radiusKm: 75 });
    expect(result.excluded).toBe("unavailable");
  });

  it("excludes stale availability", () => {
    const result = evaluateCandidate(candidate("cand-08"), REQUEST, { radiusKm: 75 });
    expect(result.excluded).toBe("stale_availability");
  });

  it("never presents unknown eligibility as approved", () => {
    const result = evaluateCandidate(candidate("cand-09"), REQUEST, { radiusKm: 75 });
    expect(result.excluded).toBe("eligibility_not_approved");
  });

  it("excludes deferred and expired assessments", () => {
    expect(evaluateCandidate(candidate("cand-10"), REQUEST, { radiusKm: 75 }).excluded).toBe(
      "eligibility_not_approved",
    );
    expect(evaluateCandidate(candidate("cand-14"), REQUEST, { radiusKm: 75 }).excluded).toBe(
      "eligibility_not_approved",
    );
  });

  it("excludes candidates without alert consent", () => {
    const result = evaluateCandidate(candidate("cand-13"), REQUEST, { radiusKm: 75 });
    expect(result.excluded).toBe("no_alert_consent");
  });

  it("excludes candidates outside the radius", () => {
    const result = evaluateCandidate(candidate("cand-12"), REQUEST, { radiusKm: 10 });
    expect(result.excluded).toBe("out_of_radius");
  });

  it("excludes candidates already involved in the request", () => {
    const result = evaluateCandidate(candidate("cand-01"), REQUEST, {
      radiusKm: 75,
      involved: new Set(["cand-01"]),
    });
    expect(result.excluded).toBe("already_involved");
  });

  it("excludes candidates at the active commitment limit", () => {
    const overloaded: MockCandidate = { ...candidate("cand-01"), activeCommitments: 2 };
    const result = evaluateCandidate(overloaded, REQUEST, { radiusKm: 75 });
    expect(result.excluded).toBe("active_commitment_limit");
  });

  it("does not claim compatibility matching for components without a safe table", () => {
    const result = evaluateCandidate(candidate("cand-01"), { ...REQUEST, component: "platelets" }, {
      radiusKm: 75,
    });
    expect(result.excluded).toBe("incompatible");
  });
});

describe("deterministic ranking", () => {
  it("orders eligible candidates by score then distance, stably", () => {
    const first = rankCandidates(MOCK_CANDIDATES, REQUEST, { radiusKm: 75 });
    const second = rankCandidates([...MOCK_CANDIDATES].reverse(), REQUEST, { radiusKm: 75 });

    const idsA = eligibleOnly(first).map((c) => c.id);
    const idsB = eligibleOnly(second).map((c) => c.id);
    expect(idsA).toEqual(idsB);
  });

  it("puts nearer, fresher, verified donors ahead", () => {
    const ranked = rankCandidates(MOCK_CANDIDATES, REQUEST, { radiusKm: 75 });
    const eligible = ranked.filter((row) => row.excluded === null);
    expect(eligible.length).toBeGreaterThan(0);
    for (let i = 1; i < eligible.length; i += 1) {
      expect(eligible[i - 1]!.score).toBeGreaterThanOrEqual(eligible[i]!.score);
    }
    expect(eligible[0]!.rank).toBe(1);
  });

  it("keeps excluded candidates in the result so the UI can explain them", () => {
    const ranked = rankCandidates(MOCK_CANDIDATES, REQUEST, { radiusKm: 75 });
    const reasons = ranked.map((row) => row.excluded).filter(Boolean);
    expect(reasons).toContain("unavailable");
    expect(reasons).toContain("eligibility_not_approved");
    expect(reasons).toContain("no_alert_consent");
  });

  it("excludes every candidate in the fixture set that must not be invited", () => {
    const ranked = rankCandidates(MOCK_CANDIDATES, REQUEST, { radiusKm: 75 });
    const approved = eligibleOnly(ranked).map((c) => c.id);
    expect(approved).not.toContain("cand-07"); // paused
    expect(approved).not.toContain("cand-09"); // unknown eligibility
    expect(approved).not.toContain("cand-10"); // deferred
    expect(approved).not.toContain("cand-13"); // no consent
    expect(approved).not.toContain("cand-16"); // awaiting assessment
  });
});

describe("notification waves", () => {
  it("reports the open wave 1 window and its configurable response window", () => {
    // The seeded scenario already has wave 1 open — that is the expected state.
    const progress = currentWaveProgress(buildEmergencyScenario(), NOW);
    expect(progress.wave?.index).toBe(1);
    expect(progress.config?.responseWindowMinutes).toBe(15);
    expect(progress.open).toBe(true);
    expect(progress.msRemaining).toBeGreaterThan(0);
    expect(progress.msRemaining).toBeLessThanOrEqual(15 * 60_000);
  });

  it("opens a wave on a request with no waves yet", () => {
    const base = { ...buildEmergencyScenario(), waveHistory: [], activeWave: 0 };
    const result = startWave(base, 1, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.waveHistory[0]?.index).toBe(1);
    expect(result.request.waveHistory[0]?.endsAt).toBe(
      new Date(NOW.getTime() + 15 * 60_000).toISOString(),
    );
  });

  it("closes the previous wave when the next one starts", () => {
    const base = buildEmergencyScenario();
    const second = startWave(base, 2, NOW);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.request.waveHistory.find((w) => w.index === 1)?.closedAt).not.toBeNull();
    expect(second.request.activeWave).toBe(2);
    expect(second.request.timeline.some((e) => e.kind === "wave_escalated")).toBe(true);
  });

  it("refuses to open an unknown wave", () => {
    const result = startWave(buildEmergencyScenario(), 99, NOW);
    expect(result.ok).toBe(false);
  });

  it("does not reopen a wave that is still open", () => {
    const result = startWave(buildEmergencyScenario(), 1, NOW);
    expect(result.ok).toBe(false);
  });

  it("advances only when the response window has elapsed and units remain", () => {
    const base = buildEmergencyScenario();
    // Window is open at NOW, so no advance yet.
    expect(shouldAdvanceWave(base, NOW)).toBe(false);

    // The seeded window ends at 06:15Z — after it lapses, advance.
    const later = new Date(Date.parse("2026-10-27T06:20:00.000Z"));
    expect(shouldAdvanceWave(base, later)).toBe(true);

    // Fully covered requests never advance.
    let covered = base;
    for (const id of ["part-1", "part-2", "part-3"]) {
      const result = acceptInvitation(covered, id, NOW);
      if (result.ok) covered = result.request;
    }
    expect(shouldAdvanceWave(covered, later)).toBe(false);
  });

  it("never invites for units that are already committed", () => {
    const base = buildEmergencyScenario();
    expect(inviteBatchSize(base)).toBe(3); // batch 4, but only 3 units uncovered

    const one = acceptInvitation(base, "part-1", NOW);
    if (one.ok) {
      expect(inviteBatchSize(one.request)).toBe(2);
    }

    let covered = base;
    for (const id of ["part-1", "part-2", "part-3"]) {
      const result = acceptInvitation(covered, id, NOW);
      if (result.ok) covered = result.request;
    }
    expect(inviteBatchSize(covered)).toBe(0);
  });
});

describe("simulated wave responses", () => {
  it("counts every response and never demonstrates an all-decline wave", () => {
    const base = buildEmergencyScenario();
    const out = simulateWaveResponses(base, NOW);
    const invited = base.participants.filter((p) => p.wave === base.activeWave);

    expect(invited.length).toBeGreaterThan(0);
    expect(out.participants.every((p) => p.state !== "invited" || p.wave !== base.activeWave)).toBe(
      true,
    );
    const wave = out.waveHistory.find((w) => w.index === base.activeWave && w.closedAt === null);
    expect(wave?.responses).toBe(invited.length);
    expect(out.participants.some((p) => p.state === "accepted")).toBe(true);
  });

  it("is deterministic and idempotent once everyone responded", () => {
    const base = buildEmergencyScenario();
    const first = simulateWaveResponses(base, NOW);
    const second = simulateWaveResponses(base, NOW);
    expect(second.participants).toEqual(first.participants);
    expect(second.timeline).toEqual(first.timeline);

    const repeat = simulateWaveResponses(first, NOW);
    expect(repeat.participants).toEqual(first.participants);
    expect(repeat.timeline).toEqual(first.timeline);
  });

  it("commits one unit per acceptance and derives the request state", () => {
    const out = simulateWaveResponses(buildEmergencyScenario(), NOW);
    const accepted = out.participants.filter((p) => p.state === "accepted");
    expect(accepted.length).toBeGreaterThan(0);
    for (const donor of accepted) expect(donor.committedUnits).toBeGreaterThanOrEqual(1);
    for (const donor of out.participants.filter((p) => p.state === "declined")) {
      expect(donor.committedUnits).toBe(0);
    }
    expect(["partially_covered", "fully_committed"]).toContain(out.state);
  });
});
