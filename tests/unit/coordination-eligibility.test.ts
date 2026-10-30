import { describe, expect, it } from "vitest";
import {
  DEMO_DONATION_POLICY,
  deriveEligibility,
  mayInvite,
  isRecordVerified,
} from "@/lib/coordination/eligibility";
import {
  canAccessConversation,
  requestDisclosure,
  QUICK_REPLIES,
} from "@/lib/coordination/communication";
import type { Conversation, Participation } from "@/lib/coordination/types";

const NOW = new Date("2026-10-27T07:00:00.000Z");

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString();
}

describe("eligibility display rules", () => {
  it("requires review when there is no assessment", () => {
    const verdict = deriveEligibility({
      hasAssessment: false,
      assessmentReviewedAt: null,
      selfReportedAvailable: false,
      deferredUntil: null,
      now: NOW,
    });
    expect(verdict.state).toBe("requires_review");
    expect(verdict.inviteAllowed).toBe(false);
    expect(verdict.claimsMedicalClearance).toBe(false);
  });

  it("treats self-reported availability as self-reported, not eligible", () => {
    const verdict = deriveEligibility({
      hasAssessment: false,
      assessmentReviewedAt: null,
      selfReportedAvailable: true,
      deferredUntil: null,
      now: NOW,
    });
    expect(verdict.state).toBe("self_reported");
    expect(verdict.state).not.toBe("eligible");
    expect(verdict.claimsMedicalClearance).toBe(false);
  });

  it("keeps a current authorised assessment as eligible", () => {
    const verdict = deriveEligibility({
      hasAssessment: true,
      assessmentReviewedAt: daysAgo(10),
      selfReportedAvailable: true,
      deferredUntil: null,
      now: NOW,
    });
    expect(verdict.state).toBe("eligible");
    expect(verdict.inviteAllowed).toBe(true);
    expect(verdict.claimsMedicalClearance).toBe(false);
  });

  it("does not present an outdated assessment as current", () => {
    const verdict = deriveEligibility({
      hasAssessment: true,
      assessmentReviewedAt: daysAgo(DEMO_DONATION_POLICY.assessmentValidDays + 5),
      selfReportedAvailable: true,
      deferredUntil: null,
      now: NOW,
    });
    expect(verdict.state).toBe("assessment_expired");
    expect(verdict.inviteAllowed).toBe(false);
  });

  it("reports a future deferral without claiming eligibility", () => {
    const verdict = deriveEligibility({
      hasAssessment: true,
      assessmentReviewedAt: daysAgo(5),
      selfReportedAvailable: true,
      deferredUntil: new Date(NOW.getTime() + 3 * 86_400_000).toISOString(),
      now: NOW,
    });
    expect(verdict.state).toBe("deferred");
    expect(verdict.inviteAllowed).toBe(false);
  });

  it("reports an assessment with no recorded date as awaiting assessment", () => {
    const verdict = deriveEligibility({
      hasAssessment: true,
      assessmentReviewedAt: null,
      selfReportedAvailable: true,
      deferredUntil: null,
      now: NOW,
    });
    expect(verdict.state).toBe("awaiting_assessment");
    expect(verdict.inviteAllowed).toBe(false);
  });
});

describe("availability never overrides eligibility", () => {
  const restricted = deriveEligibility({
    hasAssessment: false,
    assessmentReviewedAt: null,
    selfReportedAvailable: false,
    deferredUntil: null,
    now: NOW,
  });

  it("refuses an invite when availability is not 'available'", () => {
    expect(mayInvite(restricted, "unavailable", true)).toBe(false);
    expect(mayInvite(restricted, "paused", true)).toBe(false);
    expect(mayInvite(restricted, "unknown", true)).toBe(false);
  });

  it("refuses an invite without consent even when available and eligible", () => {
    const eligible = deriveEligibility({
      hasAssessment: true,
      assessmentReviewedAt: daysAgo(3),
      selfReportedAvailable: true,
      deferredUntil: null,
      now: NOW,
    });
    expect(mayInvite(eligible, "available", true)).toBe(true);
    expect(mayInvite(eligible, "available", false)).toBe(false);
  });

  it("keeps an eligible-but-paused donor out", () => {
    const eligible = deriveEligibility({
      hasAssessment: true,
      assessmentReviewedAt: daysAgo(3),
      selfReportedAvailable: true,
      deferredUntil: null,
      now: NOW,
    });
    expect(mayInvite(eligible, "paused", true)).toBe(false);
  });
});

describe("donation records", () => {
  it("does not treat a self-reported record as verified", () => {
    expect(isRecordVerified("self_reported")).toBe(false);
    expect(isRecordVerified("submitted")).toBe(false);
    expect(isRecordVerified("rejected")).toBe(false);
    expect(isRecordVerified("verified")).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * Communication access
 * ------------------------------------------------------------------ */

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: "conv:RD-2026-1042:cand-01",
    requestId: "RD-2026-1042",
    participantId: "part-1",
    messages: [],
    contactDisclosed: false,
    blocked: false,
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

function participation(overrides: Partial<Participation> = {}): Participation {
  return {
    id: "part-1",
    requestId: "RD-2026-1042",
    donorId: "cand-01",
    donorName: "S. Tamang",
    donorBloodGroup: "O_POS",
    distanceKm: 3.2,
    committedUnits: 1,
    confirmedUnits: 0,
    state: "accepted",
    invitedAt: NOW.toISOString(),
    respondedAt: NOW.toISOString(),
    arrivedAt: null,
    screenedAt: null,
    donatedAt: null,
    confirmedAt: null,
    updatedAt: NOW.toISOString(),
    withdrawalReason: null,
    sharingLiveLocation: false,
    liveLocationUpdatedAt: null,
    wave: 1,
    ...overrides,
  };
}

describe("conversation authorisation", () => {
  const participants = [
    participation(),
    participation({
      id: "part-2",
      donorId: "cand-07",
      state: "declined",
      committedUnits: 0,
    }),
    participation({
      id: "part-3",
      donorId: "cand-08",
      state: "invited",
      committedUnits: 0,
    }),
    participation({
      id: "part-4",
      donorId: "cand-99",
      state: "accepted",
    }),
  ];

  const base = {
    conversation: conversation(),
    participants,
    requestTerminal: false,
  };

  it("lets the requester read their own conversation", () => {
    expect(canAccessConversation({ ...base, actorId: "requester-1", isRequester: true })).toEqual({
      allowed: true,
    });
  });

  it("lets an accepted donor read the conversation", () => {
    expect(canAccessConversation({ ...base, actorId: "cand-01", isRequester: false })).toEqual({
      allowed: true,
    });
  });

  it("refuses a donor who was invited but declined", () => {
    expect(canAccessConversation({ ...base, actorId: "cand-07", isRequester: false })).toMatchObject({
      allowed: false,
      reason: "not_accepted",
    });
  });

  it("refuses a donor who never accepted", () => {
    expect(canAccessConversation({ ...base, actorId: "cand-08", isRequester: false })).toMatchObject({
      allowed: false,
      reason: "not_accepted",
    });
  });

  it("refuses a donor with no participation in this request", () => {
    expect(canAccessConversation({ ...base, actorId: "stranger", isRequester: false })).toMatchObject({
      allowed: false,
      reason: "not_participant",
    });
  });

  it("refuses access once blocked", () => {
    expect(
      canAccessConversation({
        ...base,
        actorId: "requester-1",
        isRequester: true,
        conversation: conversation({ blocked: true }),
      }),
    ).toMatchObject({ allowed: false, reason: "blocked" });
  });
});

describe("contact disclosure consent", () => {
  it("does not require disclosure for in-app chat", () => {
    expect(requestDisclosure({ channel: "in_app", shareWhat: [], acknowledged: false })).toMatchObject({
      allowed: true,
      support: "implemented",
    });
  });

  it("refuses a third-party hand-off that was not acknowledged", () => {
    expect(
      requestDisclosure({ channel: "whatsapp", shareWhat: ["phone_number"], acknowledged: false }),
    ).toMatchObject({ allowed: false, reason: "unsupported" });
    expect(
      requestDisclosure({ channel: "phone", shareWhat: ["phone_number"], acknowledged: false }),
    ).toMatchObject({ allowed: false, reason: "not_acknowledged" });
  });

  it("refuses disclosure with nothing selected", () => {
    expect(
      requestDisclosure({ channel: "phone", shareWhat: [], acknowledged: true }),
    ).toMatchObject({ allowed: false, reason: "not_acknowledged" });
  });

  it("allows a phone hand-off once the owner acknowledges what is shared", () => {
    expect(
      requestDisclosure({ channel: "phone", shareWhat: ["phone_number"], acknowledged: true }),
    ).toMatchObject({ allowed: true, support: "simulated" });
  });

  it("reports unavailable channels honestly", () => {
    for (const channel of ["whatsapp", "messenger", "viber", "sms"] as const) {
      expect(
        requestDisclosure({ channel, shareWhat: ["phone_number"], acknowledged: true }),
      ).toMatchObject({ allowed: false, reason: "unsupported" });
    }
  });
});

describe("quick replies", () => {
  it("covers acceptance, progress, arrival, entrance and withdrawal", () => {
    expect(QUICK_REPLIES).toHaveLength(6);
    expect(QUICK_REPLIES).toContain("quick.withdraw");
    expect(QUICK_REPLIES).toContain("quick.arrived");
  });
});
