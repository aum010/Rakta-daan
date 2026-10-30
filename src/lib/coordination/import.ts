/**
 * Bridge between the existing demo request wizard and the coordination demo.
 *
 * A request submitted through the wizard becomes the coordination aggregate, so
 * the mobile journey (submit → match → notify → coordinate → confirm → close)
 * runs on the same object the requester just created. This is browser-local
 * state only: no server record, message or notification is produced.
 */
import type { BloodComponent, BloodGroup, Urgency } from "@/lib/blood";
import type { DemoRequest } from "@/mocks/request";
import { defaultWavePlan } from "./waves";
import type { CoordinationRequest, LocationChoice } from "./types";

function asBloodGroup(value: string): BloodGroup {
  return (["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG"] as const).includes(
    value as BloodGroup,
  )
    ? (value as BloodGroup)
    : "O_POS";
}

function asComponent(value: string): BloodComponent {
  return (["whole_blood", "prbc", "platelets", "plasma"] as const).includes(
    value as BloodComponent,
  )
    ? (value as BloodComponent)
    : "whole_blood";
}

export function importDemoRequest(
  record: DemoRequest,
  location: LocationChoice | null,
): CoordinationRequest {
  const now = new Date().toISOString();
  const parsedUnits = Number(record.units);
  const units = Math.max(1, Math.min(10, Math.round(parsedUnits) || 1));

  return {
    reference: record.reference,
    state: "submitted",
    bloodGroup: asBloodGroup(record.bloodGroup),
    component: asComponent(record.component),
    unitsRequired: units,
    urgency: (["routine", "urgent", "critical"] as const).includes(record.urgency as Urgency)
      ? (record.urgency as Urgency)
      : "urgent",
    hospital: record.hospital,
    hospitalLat: location?.lat ?? 0,
    hospitalLng: location?.lng ?? 0,
    districtCode: record.district,
    provinceCode: location?.provinceCode ?? "P3",
    neededBy: record.neededBy,
    requesterName: record.contactName,
    createdAt: record.createdAt,
    updatedAt: now,
    expiresAt: record.expiresAt,
    participants: [],
    waves: [...defaultWavePlan()],
    waveHistory: [],
    activeWave: 0,
    timeline: [{ at: record.createdAt, kind: "submitted" }],
    confirmedUnits: 0,
    cancelledAt: null,
    fulfilledAt: null,
  };
}
