import { describe, expect, it } from "vitest";
import { evaluateDonor, rankMatches, type DonorRecord, type RequestCriteria } from "@/lib/matching";
import { districtDistanceKm } from "@/lib/geo";
import { AVAILABILITY_FRESH_DAYS } from "@/lib/constants";

const NOW = new Date("2026-10-26T06:00:00Z");

const request: RequestCriteria = {
  bloodGroupNeeded: "A_POS",
  component: "whole_blood",
  districtCode: "KTM",
  createdByUserId: "11111111-1111-1111-1111-111111111111",
};

function donor(overrides: Partial<DonorRecord> = {}): DonorRecord {
  return {
    donorId: "22222222-2222-2222-2222-222222222222",
    userId: "33333333-3333-3333-3333-333333333333",
    bloodGroup: "A_POS",
    dateOfBirth: "1995-05-05",
    districtCode: "KTM",
    provinceCode: "P3",
    availability: "available",
    availabilityConfirmedAt: NOW,
    lastDonationDate: null,
    deferredUntil: null,
    consentAlerts: true,
    verification: "phone_verified",
    withdrawnAt: null,
    ...overrides,
  };
}

describe("donor matching rules", () => {
  it("accepts a fresh, consented, available donor in the same district", () => {
    const result = evaluateDonor(donor(), request, { now: NOW });
    expect(result.eligible).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(result.distanceKm).toBe(0);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("excludes donors who withdrew or never consented", () => {
    expect(evaluateDonor(donor({ withdrawnAt: NOW }), request, { now: NOW }).reasons).toContain(
      "withdrawn",
    );
    expect(evaluateDonor(donor({ consentAlerts: false }), request, { now: NOW }).reasons).toContain(
      "no_alert_consent",
    );
  });

  it("never matches the requester to themselves", () => {
    const result = evaluateDonor(donor({ userId: request.createdByUserId }), request, { now: NOW });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("same_user");
  });

  it("excludes donors marked unavailable", () => {
    expect(evaluateDonor(donor({ availability: "unavailable" }), request, { now: NOW }).eligible).toBe(
      false,
    );
    expect(evaluateDonor(donor({ availability: "paused" }), request, { now: NOW }).reasons).toContain(
      "unavailable",
    );
  });

  it("expires stale availability", () => {
    const staleAt = new Date(NOW.getTime() - (AVAILABILITY_FRESH_DAYS + 1) * 86_400_000);
    expect(
      evaluateDonor(donor({ availabilityConfirmedAt: staleAt }), request, { now: NOW }).reasons,
    ).toContain("stale_availability");

    const freshAt = new Date(NOW.getTime() - (AVAILABILITY_FRESH_DAYS - 1) * 86_400_000);
    expect(
      evaluateDonor(donor({ availabilityConfirmedAt: freshAt }), request, { now: NOW }).eligible,
    ).toBe(true);
  });

  it("enforces the 90-day donation interval", () => {
    const recent = new Date(NOW.getTime() - 20 * 86_400_000).toISOString().slice(0, 10);
    const old = new Date(NOW.getTime() - 120 * 86_400_000).toISOString().slice(0, 10);
    expect(evaluateDonor(donor({ lastDonationDate: recent }), request, { now: NOW }).reasons).toContain(
      "cooldown",
    );
    expect(evaluateDonor(donor({ lastDonationDate: old }), request, { now: NOW }).eligible).toBe(true);
  });

  it("honours temporary deferrals", () => {
    const tomorrow = new Date(NOW.getTime() + 86_400_000).toISOString().slice(0, 10);
    expect(evaluateDonor(donor({ deferredUntil: tomorrow }), request, { now: NOW }).reasons).toContain(
      "deferred",
    );
  });

  it("enforces the 18-65 age window", () => {
    expect(
      evaluateDonor(donor({ dateOfBirth: "2010-01-01" }), request, { now: NOW }).reasons,
    ).toContain("age");
    expect(
      evaluateDonor(donor({ dateOfBirth: "1950-01-01" }), request, { now: NOW }).reasons,
    ).toContain("age");
  });

  it("respects the search radius", () => {
    const far = evaluateDonor(donor({ districtCode: "HUM", provinceCode: "P6" }), request, {
      now: NOW,
      radiusKm: 75,
    });
    expect(far.reasons).toContain("out_of_range");
    expect(far.eligible).toBe(false);
    expect(districtDistanceKm("KTM", "HUM")).toBeGreaterThan(300);
  });

  it("does not use the red-cell table for platelets", () => {
    const result = evaluateDonor(donor(), { ...request, component: "platelets" }, { now: NOW });
    expect(result.reasons).toContain("component_not_supported");
  });

  it("ranks the closest eligible donors first", () => {
    const near = donor({ donorId: "near", districtCode: "KTM" });
    const mid = donor({ donorId: "mid", districtCode: "LAL" });
    const far = donor({ donorId: "far", districtCode: "CHI" });
    const blocked = donor({ donorId: "blocked", availability: "paused" });
    const ranked = rankMatches([far, near, blocked, mid], request, { now: NOW, radiusKm: 250 });
    expect(ranked.map((match) => match.donor.donorId)).toEqual(["near", "mid", "far"]);
  });

  it("reports a distance for same-district donors of zero", () => {
    expect(districtDistanceKm("KTM", "KTM")).toBe(0);
    expect(districtDistanceKm("KTM", "UNKNOWN")).toBeNull();
  });
});
