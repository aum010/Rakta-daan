/**
 * Repeatable demo scenarios.
 *
 * Three fixed scenarios, all resettable, all labelled as demonstration data:
 *
 *  A. Emergency three-unit request with sequential donor waves — the primary
 *     walkthrough from §22 of the brief.
 *  B. A donor whose eligibility is unknown / unavailable and must NOT be
 *     treated as eligible and available.
 *  C. Location permission denied, then manual location selection succeeds.
 *
 * Scenario A is seeded in the `searching` state with wave 1 open and three
 * invitations outstanding, so the first acceptance happens immediately.
 */
import type { CoordinationRequest, Participation } from "./types";
import { defaultWavePlan } from "./waves";
import { emptyState, type ContactChannel, type CoordinationState } from "./store";

export const SCENARIO_IDS = ["emergency-three-units", "unknown-eligibility", "location-denied"] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

const BASE_TIME = Date.parse("2026-10-27T06:00:00.000Z");

function iso(offsetMs: number): string {
  return new Date(BASE_TIME + offsetMs).toISOString();
}

function participation(
  overrides: Partial<Participation> & Pick<Participation, "id" | "donorId" | "donorName" | "donorBloodGroup">,
): Participation {
  return {
    requestId: "RD-2026-1042",
    distanceKm: 5,
    committedUnits: 0,
    confirmedUnits: 0,
    state: "invited",
    invitedAt: iso(0),
    respondedAt: null,
    arrivedAt: null,
    screenedAt: null,
    donatedAt: null,
    confirmedAt: null,
    updatedAt: iso(0),
    withdrawalReason: null,
    sharingLiveLocation: false,
    liveLocationUpdatedAt: null,
    wave: 1,
    ...overrides,
  };
}

export function buildEmergencyScenario(): CoordinationRequest {
  return {
    reference: "RD-2026-1042",
    state: "searching",
    bloodGroup: "O_POS",
    component: "whole_blood",
    unitsRequired: 3,
    urgency: "urgent",
    hospital: "Demo Teaching Hospital",
    hospitalLat: 27.7172,
    hospitalLng: 85.324,
    districtCode: "KTM",
    provinceCode: "P3",
    neededBy: iso(6 * 3_600_000),
    requesterName: "Demo Requester",
    createdAt: iso(-1_800_000),
    updatedAt: iso(0),
    expiresAt: iso(72 * 3_600_000),
    participants: [
      participation({
        id: "part-1",
        donorId: "cand-01",
        donorName: "S. Tamang",
        donorBloodGroup: "O_POS",
        distanceKm: 3.2,
      }),
      participation({
        id: "part-2",
        donorId: "cand-02",
        donorName: "R. Gurung",
        donorBloodGroup: "O_NEG",
        distanceKm: 5.8,
      }),
      participation({
        id: "part-3",
        donorId: "cand-03",
        donorName: "A. Shrestha",
        donorBloodGroup: "O_POS",
        distanceKm: 8.4,
      }),
    ],
    waves: defaultWavePlan(),
    waveHistory: [
      {
        index: 1,
        startedAt: iso(-1_200_000),
        endsAt: iso(15 * 60_000),
        invited: 3,
        responses: 0,
        closedAt: null,
        escalated: false,
      },
    ],
    activeWave: 1,
    timeline: [
      { at: iso(-1_800_000), kind: "submitted" },
      { at: iso(-1_500_000), kind: "search_started" },
      { at: iso(-1_200_000), kind: "wave_started", detail: "1" },
      { at: iso(-1_200_000), kind: "candidate_invited", detail: "1" },
      { at: iso(-1_100_000), kind: "candidate_invited", detail: "1" },
      { at: iso(-1_000_000), kind: "candidate_invited", detail: "1" },
    ],
    confirmedUnits: 0,
    cancelledAt: null,
    fulfilledAt: null,
  };
}

/**
 * How each seeded persona asked to be reached — reserved fictional numbers in
 * the same demo range as the rest of the fixtures, with the channel they chose.
 * They exist so the contact panel can show what the platform knows: which
 * channel to use, and a number that is only revealed once that side consents.
 * No real person is reachable on any of these.
 */
const DEMO_CONTACTS: Record<string, ContactChannel> = {
  requester: { channel: "phone", value: "+977-1-555-0100" },
  "cand-01": { channel: "whatsapp", value: "+977-9841-5550101" },
  "cand-02": { channel: "viber", value: "+977-9841-5550102" },
  "cand-03": { channel: "sms", value: "+977-9841-5550103" },
};

export function buildScenario(id: ScenarioId): CoordinationState {
  const base = emptyState(id);

  switch (id) {
    case "emergency-three-units":
      return {
        ...base,
        request: buildEmergencyScenario(),
        contacts: { ...DEMO_CONTACTS },
        donationHistory: [],
        location: {
          provinceCode: "P3",
          districtCode: "KTM",
          municipality: "Kathmandu Metropolitan City",
          area: "Maharajgunj",
          hospital: "Demo Teaching Hospital",
          lat: 27.7172,
          lng: 85.324,
          source: "manual",
        },
      };

    case "unknown-eligibility": {
      // A donor profile with unknown eligibility and paused availability.
      return {
        ...base,
        role: "donor",
        actingDonorId: "cand-09",
        request: buildEmergencyScenario(),
        contacts: { ...DEMO_CONTACTS },
        donationHistory: [
          {
            id: "don-1",
            date: "2026-05-12",
            component: "whole_blood",
            facility: "[Demo] Kantipur Community Blood Bank",
            verification: "self_reported",
            source: "Donor entered",
            updatedAt: "2026-05-12T10:00:00.000Z",
            verificationRef: null,
          },
          {
            id: "don-2",
            date: "2025-11-03",
            component: "whole_blood",
            facility: "[Demo] Lalitpur Community Hospital",
            verification: "verified",
            source: "Facility record",
            updatedAt: "2026-01-04T09:30:00.000Z",
            verificationRef: "VER-DEMO-771",
          },
        ],
        location: {
          provinceCode: "P3",
          districtCode: "KTM",
          municipality: "Kathmandu Metropolitan City",
          area: "Baneshwor",
          hospital: "",
          lat: null,
          lng: null,
          source: "manual",
        },
      };
    }

    case "location-denied":
      return {
        ...base,
        locationPermission: "denied",
        request: null,
        location: null,
      };
  }
}

export const SCENARIO_LABELS: Record<ScenarioId, { titleKey: string; bodyKey: string }> = {
  "emergency-three-units": {
    titleKey: "scenario.emergency.title",
    bodyKey: "scenario.emergency.body",
  },
  "unknown-eligibility": {
    titleKey: "scenario.eligibility.title",
    bodyKey: "scenario.eligibility.body",
  },
  "location-denied": {
    titleKey: "scenario.location.title",
    bodyKey: "scenario.location.body",
  },
};
