import { beforeEach, describe, expect, it } from "vitest";
import {
  SCENARIO_IDS,
  buildScenario,
  buildEmergencyScenario,
} from "@/lib/coordination/scenarios";
import {
  DEFAULT_CONSENT,
  ensureConversation,
  getCoordinationState,
  resetCoordination,
  setCoordination,
  updateCoordination,
  upsertConversation,
} from "@/lib/coordination/store";
import { computeAllocation } from "@/lib/coordination/request-machine";
import type { Participation } from "@/lib/coordination/types";

function participation(overrides: Partial<Participation> = {}): Participation {
  return {
    requestId: "RD-2026-1042",
    id: "part-1",
    donorId: "cand-01",
    donorName: "S. Tamang",
    donorBloodGroup: "O_POS",
    distanceKm: 3.2,
    committedUnits: 0,
    confirmedUnits: 0,
    state: "invited",
    invitedAt: "2026-10-27T06:00:00.000Z",
    respondedAt: null,
    arrivedAt: null,
    screenedAt: null,
    donatedAt: null,
    confirmedAt: null,
    updatedAt: "2026-10-27T06:00:00.000Z",
    withdrawalReason: null,
    sharingLiveLocation: false,
    liveLocationUpdatedAt: null,
    wave: 1,
    ...overrides,
  };
}

beforeEach(() => {
  resetCoordination();
});

describe("seeded demo scenarios", () => {
  it("offers exactly the three documented scenarios", () => {
    expect([...SCENARIO_IDS]).toEqual([
      "emergency-three-units",
      "unknown-eligibility",
      "location-denied",
    ]);
  });

  it("seeds the emergency request in searching state with wave 1 open", () => {
    const state = buildScenario("emergency-three-units");
    expect(state.scenario).toBe("emergency-three-units");
    expect(state.request).not.toBeNull();
    const request = state.request!;
    expect(request.state).toBe("searching");
    expect(request.unitsRequired).toBe(3);
    expect(request.participants).toHaveLength(3);
    expect(request.activeWave).toBe(1);
    expect(request.participants.every((p) => p.state === "invited")).toBe(true);
    expect(computeAllocation(request).unitsCommitted).toBe(0);
  });

  it("never seeds the emergency scenario with commitments already made", () => {
    const request = buildEmergencyScenario();
    expect(request.confirmedUnits).toBe(0);
    expect(request.participants.some((p) => p.committedUnits > 0)).toBe(false);
  });

  it("seeds the unknown-eligibility scenario as the donor side with history", () => {
    const state = buildScenario("unknown-eligibility");
    expect(state.role).toBe("donor");
    expect(state.actingDonorId).toBe("cand-09");
    expect(state.donationHistory.length).toBeGreaterThan(0);
    // History must carry verification status — never a blanket "verified".
    expect(state.donationHistory.some((d) => d.verification !== "verified")).toBe(true);
  });

  it("seeds the location-denied scenario with permission denied and no request", () => {
    const state = buildScenario("location-denied");
    expect(state.locationPermission).toBe("denied");
    expect(state.request).toBeNull();
    expect(state.location).toBeNull();
  });

  it("starts every scenario with location consent fully off", () => {
    for (const id of SCENARIO_IDS) {
      expect(buildScenario(id).locationConsent).toEqual(DEFAULT_CONSENT);
    }
  });
});

describe("reset", () => {
  it("clears request, conversations, history and consent back to empty", () => {
    setCoordination(buildScenario("emergency-three-units"));
    const request = getCoordinationState().request!;
    ensureConversation(request.reference, participation());

    resetCoordination();

    const state = getCoordinationState();
    expect(state.scenario).toBe("none");
    expect(state.request).toBeNull();
    expect(state.conversations).toHaveLength(0);
    expect(state.donationHistory).toHaveLength(0);
    expect(state.locationConsent).toEqual(DEFAULT_CONSENT);
    expect(state.location).toBeNull();
    expect(state.locationPermission).toBe("unknown");
    expect(state.actingDonorId).toBeNull();
  });
});

describe("conversation creation (privacy by default)", () => {
  it("opens a conversation with contact details hidden", () => {
    const conversation = ensureConversation("RD-2026-1042", participation());
    expect(conversation.contactDisclosed).toBe(false);
    expect(conversation.blocked).toBe(false);
    expect(conversation.messages).toHaveLength(0);
    expect(conversation.id).toBe("conv:RD-2026-1042:cand-01");
  });

  it("reuses the same conversation instead of opening a second one", () => {
    const first = ensureConversation("RD-2026-1042", participation());
    const second = ensureConversation("RD-2026-1042", participation());
    expect(second.id).toBe(first.id);
    expect(getCoordinationState().conversations).toHaveLength(1);
  });

  it("keeps conversations separate per request and per donor", () => {
    ensureConversation("RD-2026-1042", participation());
    ensureConversation("RD-2026-1043", participation());
    ensureConversation("RD-2026-1042", participation({ id: "part-2", donorId: "cand-02" }));
    expect(getCoordinationState().conversations).toHaveLength(3);
  });

  it("persists the owner's disclosure decision across upserts", () => {
    const conversation = ensureConversation("RD-2026-1042", participation());
    upsertConversation({ ...conversation, contactDisclosed: true });
    expect(getCoordinationState().conversations[0]?.contactDisclosed).toBe(true);
    upsertConversation({ ...conversation, contactDisclosed: false });
    expect(getCoordinationState().conversations[0]?.contactDisclosed).toBe(false);
  });
});

describe("location consent", () => {
  it("defaults every purpose to off", () => {
    expect(DEFAULT_CONSENT).toEqual({
      requester_discovery: false,
      donor_matching: false,
      donor_live: false,
      requester_live: false,
    });
  });

  it("toggles each purpose independently", () => {
    updateCoordination((current) => ({
      locationConsent: { ...current.locationConsent, donor_live: true },
    }));
    const consent = getCoordinationState().locationConsent;
    expect(consent.donor_live).toBe(true);
    expect(consent.requester_discovery).toBe(false);
    expect(consent.donor_matching).toBe(false);
    expect(consent.requester_live).toBe(false);
  });

  it("clears consent again when the scenario is reset", () => {
    updateCoordination((current) => ({
      locationConsent: { ...current.locationConsent, requester_discovery: true },
    }));
    resetCoordination();
    expect(getCoordinationState().locationConsent).toEqual(DEFAULT_CONSENT);
  });
});
