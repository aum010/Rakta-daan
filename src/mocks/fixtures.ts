/**
 * Clearly synthetic demonstration records.
 *
 * These are NOT live data. They exist so the frontend previews can show
 * realistic density without claiming production inventory, donor identities or
 * delivery results. Timestamps are fixed to keep server and client render
 * output identical (avoiding hydration mismatches).
 */

import type { BloodGroup } from "@/lib/blood";

export type DemoVerification = "verified" | "pending" | "unverified";

export type DemoInventoryRow = {
  group: string;
  component: "whole_blood" | "prbc" | "platelets" | "plasma";
  units: number;
  updatedAt: string;
  stale: boolean;
};

export type DemoFacility = {
  slug: string;
  name: string;
  nameNe: string;
  type: "blood_bank" | "hospital";
  districtCode: string;
  address: string;
  phone: string;
  email: string;
  verification: DemoVerification;
  lastUpdatedAt: string;
  inventory: DemoInventoryRow[];
};

export const DEMO_FACILITIES: DemoFacility[] = [
  {
    slug: "demo-kantipur",
    name: "[Demo] Kantipur Community Blood Bank",
    nameNe: "[डेमो] कान्तिपुर सामुदायिक रक्त बैंक",
    type: "blood_bank",
    districtCode: "KTM",
    address: "Demo marg, Kathmandu",
    phone: "+977-1-555-0101",
    email: "demo.kantipur@example.org",
    verification: "verified",
    lastUpdatedAt: "2026-10-27T03:20:00.000Z",
    inventory: [
      { group: "A_POS", component: "whole_blood", units: 8, updatedAt: "2026-10-27T03:20:00.000Z", stale: false },
      { group: "B_POS", component: "whole_blood", units: 3, updatedAt: "2026-10-27T03:20:00.000Z", stale: false },
      { group: "O_POS", component: "whole_blood", units: 5, updatedAt: "2026-10-25T02:00:00.000Z", stale: true },
      { group: "O_NEG", component: "prbc", units: 1, updatedAt: "2026-10-27T03:20:00.000Z", stale: false },
      { group: "AB_POS", component: "platelets", units: 0, updatedAt: "2026-10-26T09:10:00.000Z", stale: false },
    ],
  },
  {
    slug: "demo-pokhara",
    name: "[Demo] Pokhara Regional Hospital Blood Unit",
    nameNe: "[डेमो] पोखरा क्षेत्रीय अस्पताल रक्त इकाई",
    type: "hospital",
    districtCode: "KAS",
    address: "Demo road, Pokhara",
    phone: "+977-61-555-0102",
    email: "demo.pokhara@example.org",
    verification: "verified",
    lastUpdatedAt: "2026-10-27T01:05:00.000Z",
    inventory: [
      { group: "A_NEG", component: "prbc", units: 2, updatedAt: "2026-10-27T01:05:00.000Z", stale: false },
      { group: "B_NEG", component: "whole_blood", units: 1, updatedAt: "2026-10-27T01:05:00.000Z", stale: false },
      { group: "O_POS", component: "prbc", units: 6, updatedAt: "2026-10-24T06:00:00.000Z", stale: true },
    ],
  },
  {
    slug: "demo-biratnagar",
    name: "[Demo] Biratnagar Voluntary Blood Centre",
    nameNe: "[डेमो] विराटनगर स्वयंसेवी रक्त केन्द्र",
    type: "blood_bank",
    districtCode: "MOR",
    address: "Demo chowk, Biratnagar",
    phone: "+977-21-555-0103",
    email: "demo.biratnagar@example.org",
    verification: "pending",
    lastUpdatedAt: "2026-10-26T12:40:00.000Z",
    inventory: [
      { group: "AB_NEG", component: "whole_blood", units: 1, updatedAt: "2026-10-26T12:40:00.000Z", stale: false },
      { group: "A_POS", component: "whole_blood", units: 4, updatedAt: "2026-10-26T12:40:00.000Z", stale: false },
    ],
  },
  {
    slug: "demo-lalitpur",
    name: "[Demo] Lalitpur Community Hospital",
    nameNe: "[डेमो] ललितपुर सामुदायिक अस्पताल",
    type: "hospital",
    districtCode: "LAL",
    address: "Demo street, Lalitpur",
    phone: "+977-1-555-0104",
    email: "demo.lalitpur@example.org",
    verification: "unverified",
    lastUpdatedAt: "2026-10-23T08:15:00.000Z",
    inventory: [
      { group: "B_POS", component: "whole_blood", units: 2, updatedAt: "2026-10-23T08:15:00.000Z", stale: true },
    ],
  },
  {
    slug: "demo-chitwan",
    name: "[Demo] Chitwan Blood Service",
    nameNe: "[डेमो] चितवन रक्त सेवा",
    type: "blood_bank",
    districtCode: "CHI",
    address: "Demo road, Bharatpur",
    phone: "+977-56-555-0105",
    email: "demo.chitwan@example.org",
    verification: "verified",
    lastUpdatedAt: "2026-10-27T04:00:00.000Z",
    inventory: [
      { group: "O_NEG", component: "whole_blood", units: 2, updatedAt: "2026-10-27T04:00:00.000Z", stale: false },
      { group: "A_POS", component: "platelets", units: 1, updatedAt: "2026-10-27T04:00:00.000Z", stale: false },
    ],
  },
];

export type DemoAdminRequest = {
  reference: string;
  bloodGroup: BloodGroup;
  component: "whole_blood" | "prbc" | "platelets" | "plasma";
  units: number;
  districtCode: string;
  facility: string;
  urgency: "routine" | "urgent" | "critical";
  status: "open" | "fulfilled" | "cancelled" | "expired";
  createdAt: string;
  neededBy: string;
  notified: number;
  responses: number;
  contactName: string;
  note: string;
};

export const DEMO_ADMIN_REQUESTS: DemoAdminRequest[] = [
  {
    reference: "DEMO-7K4P2Q",
    bloodGroup: "O_POS",
    component: "whole_blood",
    units: 2,
    districtCode: "KTM",
    facility: "Demo Teaching Hospital",
    urgency: "urgent",
    status: "open",
    createdAt: "2026-10-27T04:12:00.000Z",
    neededBy: "2026-10-28T10:00:00.000Z",
    notified: 12,
    responses: 2,
    contactName: "Demo R. Shrestha",
    note: "Synthetic record for interface review.",
  },
  {
    reference: "DEMO-3M8XW2",
    bloodGroup: "A_NEG",
    component: "prbc",
    units: 1,
    districtCode: "KAS",
    facility: "Demo Pokhara Hospital",
    urgency: "critical",
    status: "open",
    createdAt: "2026-10-27T02:35:00.000Z",
    neededBy: "2026-10-27T18:00:00.000Z",
    notified: 7,
    responses: 1,
    contactName: "Demo S. Gurung",
    note: "Synthetic critical request.",
  },
  {
    reference: "DEMO-9Q2RT5",
    bloodGroup: "B_POS",
    component: "whole_blood",
    units: 3,
    districtCode: "LAL",
    facility: "Demo Lalitpur Hospital",
    urgency: "routine",
    status: "fulfilled",
    createdAt: "2026-10-26T06:10:00.000Z",
    neededBy: "2026-10-30T09:00:00.000Z",
    notified: 15,
    responses: 4,
    contactName: "Demo M. Tamang",
    note: "Synthetic fulfilled request.",
  },
  {
    reference: "DEMO-5H7NC1",
    bloodGroup: "AB_POS",
    component: "platelets",
    units: 1,
    districtCode: "MOR",
    facility: "Demo Biratnagar Centre",
    urgency: "urgent",
    status: "cancelled",
    createdAt: "2026-10-25T11:45:00.000Z",
    neededBy: "2026-10-27T11:00:00.000Z",
    notified: 4,
    responses: 0,
    contactName: "Demo P. Rai",
    note: "Synthetic cancelled request.",
  },
  {
    reference: "DEMO-8V3KB4",
    bloodGroup: "O_NEG",
    component: "whole_blood",
    units: 2,
    districtCode: "CHI",
    facility: "Demo Chitwan Blood Service",
    urgency: "urgent",
    status: "expired",
    createdAt: "2026-10-22T03:00:00.000Z",
    neededBy: "2026-10-25T03:00:00.000Z",
    notified: 9,
    responses: 1,
    contactName: "Demo K. Thapa",
    note: "Synthetic expired request.",
  },
  {
    reference: "DEMO-2D6JW9",
    bloodGroup: "A_POS",
    component: "whole_blood",
    units: 4,
    districtCode: "KTM",
    facility: "Demo Kantipur Blood Bank",
    urgency: "routine",
    status: "open",
    createdAt: "2026-10-27T05:05:00.000Z",
    neededBy: "2026-10-31T08:30:00.000Z",
    notified: 18,
    responses: 3,
    contactName: "Demo N. Adhikari",
    note: "Synthetic routine request.",
  },
];

export type DemoVerificationCase = {
  id: string;
  organisation: string;
  type: "blood_bank" | "hospital";
  districtCode: string;
  submittedAt: string;
  status: "pending" | "verified" | "rejected";
  contactName: string;
  requiredActions: string;
};

export const DEMO_VERIFICATION_CASES: DemoVerificationCase[] = [
  {
    id: "VER-1042",
    organisation: "[Demo] Biratnagar Voluntary Blood Centre",
    type: "blood_bank",
    districtCode: "MOR",
    submittedAt: "2026-10-26T08:20:00.000Z",
    status: "pending",
    contactName: "Demo staff contact",
    requiredActions: "Confirm facility registration number against the official source.",
  },
  {
    id: "VER-1043",
    organisation: "[Demo] Lalitpur Community Hospital",
    type: "hospital",
    districtCode: "LAL",
    submittedAt: "2026-10-25T10:05:00.000Z",
    status: "pending",
    contactName: "Demo hospital contact",
    requiredActions: "Verify public phone number and blood-bank counter hours.",
  },
  {
    id: "VER-1041",
    organisation: "[Demo] Chitwan Blood Service",
    type: "blood_bank",
    districtCode: "CHI",
    submittedAt: "2026-10-20T04:40:00.000Z",
    status: "verified",
    contactName: "Demo service contact",
    requiredActions: "No further action.",
  },
];

export type DemoNotification = {
  id: string;
  channel: "sms" | "whatsapp" | "email";
  recipient: string;
  template: string;
  status: "queued" | "simulated" | "delivered" | "failed";
  provider: string;
  timestamp: string;
  reason: string | null;
};

export const DEMO_NOTIFICATIONS: DemoNotification[] = [
  {
    id: "MSG-901",
    channel: "sms",
    recipient: "recipient•••4821",
    template: "request_alert",
    status: "simulated",
    provider: "mock",
    timestamp: "2026-10-27T04:13:00.000Z",
    reason: "No production provider configured.",
  },
  {
    id: "MSG-902",
    channel: "whatsapp",
    recipient: "recipient•••7710",
    template: "request_alert",
    status: "queued",
    provider: "mock",
    timestamp: "2026-10-27T04:13:05.000Z",
    reason: null,
  },
  {
    id: "MSG-903",
    channel: "sms",
    recipient: "recipient•••1944",
    template: "otp_login",
    status: "delivered",
    provider: "demo-provider",
    timestamp: "2026-10-26T12:00:00.000Z",
    reason: null,
  },
  {
    id: "MSG-904",
    channel: "email",
    recipient: "recipient•••@example.org",
    template: "request_update",
    status: "failed",
    provider: "demo-provider",
    timestamp: "2026-10-26T09:30:00.000Z",
    reason: "Synthetic provider timeout.",
  },
  {
    id: "MSG-905",
    channel: "whatsapp",
    recipient: "recipient•••3388",
    template: "request_alert",
    status: "delivered",
    provider: "demo-provider",
    timestamp: "2026-10-25T15:10:00.000Z",
    reason: null,
  },
];

export type DemoAbuseReport = {
  id: string;
  reference: string;
  reason: "fake" | "harassment" | "spam" | "wrong" | "other";
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
  summary: string;
};

export const DEMO_ABUSE_REPORTS: DemoAbuseReport[] = [
  {
    id: "AB-2201",
    reference: "DEMO-5H7NC1",
    reason: "spam",
    status: "open",
    createdAt: "2026-10-26T07:15:00.000Z",
    summary: "Synthetic report: repeated posting from one number.",
  },
  {
    id: "AB-2202",
    reference: "DEMO-8V3KB4",
    reason: "fake",
    status: "open",
    createdAt: "2026-10-25T14:40:00.000Z",
    summary: "Synthetic report: facility could not confirm the request.",
  },
  {
    id: "AB-2203",
    reference: "DEMO-9Q2RT5",
    reason: "other",
    status: "resolved",
    createdAt: "2026-10-24T09:05:00.000Z",
    summary: "Synthetic report resolved by a demo administrator.",
  },
];

export type DemoAuditEvent = {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
};

export const DEMO_AUDIT_EVENTS: DemoAuditEvent[] = [
  { id: "AUD-501", at: "2026-10-27T04:14:00.000Z", actor: "demo-admin", action: "request.viewed", target: "DEMO-7K4P2Q" },
  { id: "AUD-502", at: "2026-10-27T03:55:00.000Z", actor: "demo-admin", action: "organisation.verification_opened", target: "VER-1042" },
  { id: "AUD-503", at: "2026-10-26T13:10:00.000Z", actor: "demo-system", action: "outbox.dispatch_simulated", target: "MSG-901" },
  { id: "AUD-504", at: "2026-10-26T08:30:00.000Z", actor: "demo-reviewer", action: "abuse.resolved", target: "AB-2203" },
  { id: "AUD-505", at: "2026-10-25T05:20:00.000Z", actor: "demo-admin", action: "organisation.verified", target: "VER-1041" },
];

export type DemoCamp = {
  id: string;
  title: string;
  titleNe: string;
  organiser: string;
  venue: string;
  districtCode: string;
  startsAt: string;
  endsAt: string;
  contact: string;
  status: "scheduled" | "cancelled";
};

export const DEMO_CAMPS: DemoCamp[] = [
  {
    id: "camp-demo-1",
    title: "[Demo] Ward blood donation camp",
    titleNe: "[डेमो] वडा रक्तदान शिविर",
    organiser: "[Demo] Community Youth Club",
    venue: "Demo Community Hall",
    districtCode: "KTM",
    startsAt: "2026-11-02T02:00:00.000Z",
    endsAt: "2026-11-02T08:00:00.000Z",
    contact: "+977-1-555-0110",
    status: "scheduled",
  },
  {
    id: "camp-demo-2",
    title: "[Demo] Campus donation drive",
    titleNe: "[डेमो] क्याम्पस रक्तदान अभियान",
    organiser: "[Demo] Student Society",
    venue: "Demo Campus Block B",
    districtCode: "LAL",
    startsAt: "2026-11-06T03:00:00.000Z",
    endsAt: "2026-11-06T09:00:00.000Z",
    contact: "+977-1-555-0111",
    status: "scheduled",
  },
];

export type DemoOrgRequest = {
  reference: string;
  bloodGroup: BloodGroup;
  component: "whole_blood" | "prbc" | "platelets" | "plasma";
  units: number;
  urgency: "routine" | "urgent" | "critical";
  neededBy: string;
  facility: string;
  status: "open" | "fulfilled";
  responded: boolean;
};

export const DEMO_ORG_REQUESTS: DemoOrgRequest[] = [
  { reference: "DEMO-7K4P2Q", bloodGroup: "O_POS", component: "whole_blood", units: 2, urgency: "urgent", neededBy: "2026-10-28T10:00:00.000Z", facility: "Demo Teaching Hospital", status: "open", responded: false },
  { reference: "DEMO-3M8XW2", bloodGroup: "A_NEG", component: "prbc", units: 1, urgency: "critical", neededBy: "2026-10-27T18:00:00.000Z", facility: "Demo Pokhara Hospital", status: "open", responded: false },
  { reference: "DEMO-2D6JW9", bloodGroup: "A_POS", component: "whole_blood", units: 4, urgency: "routine", neededBy: "2026-10-31T08:30:00.000Z", facility: "Demo Kantipur Blood Bank", status: "open", responded: true },
  { reference: "DEMO-9Q2RT5", bloodGroup: "B_POS", component: "whole_blood", units: 3, urgency: "routine", neededBy: "2026-10-30T09:00:00.000Z", facility: "Demo Lalitpur Hospital", status: "fulfilled", responded: true },
];
