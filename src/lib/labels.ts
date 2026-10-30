import type { BadgeTone } from "@/components/ui/ui";
import type { Dictionary } from "@/messages/en";

export type VerificationState =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected"
  | "suspended";

export function verificationTone(state: VerificationState): BadgeTone {
  switch (state) {
    case "verified":
      return "teal";
    case "pending":
      return "amber";
    case "rejected":
    case "suspended":
      return "danger";
    default:
      return "neutral";
  }
}

export function verificationLabel(state: VerificationState, dict: Dictionary): string {
  switch (state) {
    case "verified":
      return dict.common.verified;
    case "pending":
      return dict.common.pending;
    case "rejected":
      return dict.common.rejected;
    case "suspended":
      return dict.common.suspended;
    default:
      return dict.common.unverified;
  }
}

export function orgTypeLabel(type: string, dict: Dictionary): string {
  switch (type) {
    case "hospital":
      return dict.banks.hospital;
    case "blood_bank":
      return dict.banks.bloodBank;
    case "red_cross":
      return dict.banks.redCross;
    case "ngo":
      return dict.banks.ngo;
    default:
      return dict.banks.campOrganizer;
  }
}

export function requestStatusLabel(
  status: "open" | "fulfilled" | "cancelled" | "expired",
  dict: Dictionary,
): string {
  switch (status) {
    case "open":
      return dict.request.statusOpen;
    case "fulfilled":
      return dict.request.statusFulfilled;
    case "cancelled":
      return dict.request.statusCancelled;
    default:
      return dict.request.statusExpired;
  }
}

export function requestStatusTone(
  status: "open" | "fulfilled" | "cancelled" | "expired",
): BadgeTone {
  switch (status) {
    case "open":
      return "brand";
    case "fulfilled":
      return "teal";
    case "cancelled":
      return "neutral";
    default:
      return "amber";
  }
}

export function responseStatusLabel(status: string, dict: Dictionary): string {
  switch (status) {
    case "interested":
      return dict.request.interested;
    case "declined":
      return dict.request.declined;
    case "donated":
      return dict.request.donated;
    case "withdrawn":
      return dict.respond.statusWithdrawn;
    case "notified":
      return dict.request.notified;
    default:
      return status;
  }
}

export function messageStatusTone(status: string): BadgeTone {
  switch (status) {
    case "delivered":
    case "read":
      return "teal";
    case "sent":
      return "info";
    case "queued":
    case "sending":
      return "amber";
    case "failed":
      return "danger";
    default:
      return "neutral";
  }
}

export function availabilityLabel(
  availability: "available" | "unavailable" | "paused",
  dict: Dictionary,
): string {
  switch (availability) {
    case "available":
      return dict.donor.available;
    case "paused":
      return dict.donor.paused;
    default:
      return dict.donor.unavailable;
  }
}
