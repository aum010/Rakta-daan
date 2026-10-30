import { z } from "zod";
import { BLOOD_COMPONENTS, BLOOD_GROUPS, URGENCY_VALUES } from "@/lib/blood";
import { DISTRICTS } from "@/data/geography";
import { REQUEST_EXPIRY_HOURS } from "@/lib/constants";
import { createDemoReference, normalizeDemoReference } from "./id";
import { readJson, writeJson } from "./storage";

export const DEMO_REQUESTS_KEY = "rakta-daan:demo-requests:v1";
const MAX_STORED_REQUESTS = 10;

export const CONTACT_METHODS = ["phone", "email"] as const;
export const RELATIONSHIPS = ["family", "friend", "self", "hospital", "other"] as const;

export type DemoContactMethod = (typeof CONTACT_METHODS)[number];
export type DemoRelationship = (typeof RELATIONSHIPS)[number];

const districtCodes = DISTRICTS.map((district) => district.code);

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

export const demoRequestInputSchema = z
  .object({
    bloodGroup: z.enum([...BLOOD_GROUPS, "not_sure"]),
    component: z.enum(BLOOD_COMPONENTS),
    units: z.coerce
      .number()
      .int("Enter a whole number of units.")
      .min(1, "At least one unit is required.")
      .max(10, "For more than 10 units, speak to the blood bank directly."),
    urgency: z.enum(URGENCY_VALUES),
    neededBy: z.string().min(1, "Choose when the blood is needed."),
    hospital: z
      .string()
      .trim()
      .min(2, "Enter the hospital or health facility.")
      .max(120),
    district: z.enum(districtCodes as [string, ...string[]]),
    area: optionalText(120),
    directions: optionalText(300),
    contactName: z.string().trim().min(2, "Enter a name or preferred name.").max(80),
    contactMethod: z.enum(CONTACT_METHODS),
    phone: optionalText(24),
    email: optionalText(160),
    relationship: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.enum(RELATIONSHIPS).optional(),
    ),
    notes: optionalText(500),
    consentAccuracy: z.boolean().refine((value) => value === true, {
      error: "Confirm that the details are accurate before continuing.",
    }),
    consentShare: z.boolean().refine((value) => value === true, {
      error: "Confirm how your contact preference may be shared.",
    }),
    consentUpdates: z.boolean(),
  })
  .superRefine((value, context) => {
    const neededBy = new Date(value.neededBy);
    if (Number.isNaN(neededBy.getTime())) {
      context.addIssue({
        code: "custom",
        path: ["neededBy"],
        message: "Enter a valid date and time.",
      });
    } else if (neededBy.getTime() < Date.now() - 3_600_000) {
      context.addIssue({
        code: "custom",
        path: ["neededBy"],
        message: "Choose a time in the future.",
      });
    }

    if (value.contactMethod === "phone") {
      if (!value.phone || !/^[+\d][\d\s-]{6,23}$/.test(value.phone)) {
        context.addIssue({
          code: "custom",
          path: ["phone"],
          message: "Enter a phone number a donor can reach.",
        });
      }
    } else if (!value.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.email)) {
      context.addIssue({
        code: "custom",
        path: ["email"],
        message: "Enter a valid email address.",
      });
    }
  });

export type DemoRequestInput = z.infer<typeof demoRequestInputSchema>;

export const DEMO_REQUEST_STATUSES = ["open", "fulfilled", "cancelled", "expired"] as const;
export type DemoRequestStatus = (typeof DEMO_REQUEST_STATUSES)[number];

export const TIMELINE_KINDS = ["created", "viewed", "updated", "cancelled"] as const;
export type DemoTimelineKind = (typeof TIMELINE_KINDS)[number];

export type DemoTimelineEntry = {
  at: string;
  kind: DemoTimelineKind;
};

export type DemoRequest = DemoRequestInput & {
  reference: string;
  status: DemoRequestStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  timeline: DemoTimelineEntry[];
};

export function createDemoRequest(
  input: DemoRequestInput,
  now: Date = new Date(),
): DemoRequest {
  const reference = createDemoReference();
  const expiryHours = REQUEST_EXPIRY_HOURS[input.urgency];
  return {
    ...input,
    reference,
    status: "open",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + expiryHours * 3_600_000).toISOString(),
    timeline: [{ at: now.toISOString(), kind: "created" }],
  };
}

function expireIfStale(record: DemoRequest, now: Date = new Date()): DemoRequest {
  if (record.status !== "open") return record;
  if (new Date(record.expiresAt).getTime() > now.getTime()) return record;
  return {
    ...record,
    status: "expired",
    updatedAt: now.toISOString(),
    timeline: [...record.timeline, { at: now.toISOString(), kind: "updated" }],
  };
}

export function readDemoRequests(): DemoRequest[] {
  const stored = readJson<DemoRequest[]>(DEMO_REQUESTS_KEY, []);
  if (!Array.isArray(stored)) return [];
  return stored
    .filter((record): record is DemoRequest =>
      Boolean(
        record &&
          typeof record.reference === "string" &&
          typeof record.createdAt === "string" &&
          DEMO_REQUEST_STATUSES.includes(record.status),
      ),
    )
    .map((record) => expireIfStale(record))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function persistDemoRequests(records: DemoRequest[]): boolean {
  return writeJson(DEMO_REQUESTS_KEY, records.slice(0, MAX_STORED_REQUESTS));
}

export function saveDemoRequest(record: DemoRequest): boolean {
  const existing = readDemoRequests().filter(
    (item) => item.reference !== record.reference,
  );
  return persistDemoRequests([record, ...existing]);
}

export function getDemoRequest(reference: string): DemoRequest | null {
  const normalized = normalizeDemoReference(reference);
  return readDemoRequests().find((record) => record.reference === normalized) ?? null;
}

export function updateDemoRequest(
  reference: string,
  input: DemoRequestInput,
  now: Date = new Date(),
): DemoRequest | null {
  const existing = getDemoRequest(reference);
  if (!existing || existing.status !== "open") return null;
  const updated: DemoRequest = {
    ...existing,
    ...input,
    updatedAt: now.toISOString(),
    expiresAt: new Date(
      now.getTime() + REQUEST_EXPIRY_HOURS[input.urgency] * 3_600_000,
    ).toISOString(),
    timeline: [...existing.timeline, { at: now.toISOString(), kind: "updated" }],
  };
  saveDemoRequest(updated);
  return updated;
}

export function setDemoRequestStatus(
  reference: string,
  status: Extract<DemoRequestStatus, "cancelled" | "fulfilled">,
  now: Date = new Date(),
): DemoRequest | null {
  const existing = getDemoRequest(reference);
  if (!existing) return null;
  const updated: DemoRequest = {
    ...existing,
    status,
    updatedAt: now.toISOString(),
    timeline: [
      ...existing.timeline,
      {
        at: now.toISOString(),
        kind: status === "cancelled" ? "cancelled" : "updated",
      },
    ],
  };
  saveDemoRequest(updated);
  return updated;
}

/**
 * Records that the status page was opened. Viewing is idempotent within an
 * hour so refreshing does not produce a wall of duplicate entries.
 */
export function recordDemoRequestView(
  reference: string,
  now: Date = new Date(),
): DemoRequest | null {
  const existing = getDemoRequest(reference);
  if (!existing) return null;
  const lastView = [...existing.timeline]
    .reverse()
    .find((entry) => entry.kind === "viewed");
  if (lastView && now.getTime() - new Date(lastView.at).getTime() < 3_600_000) {
    return existing;
  }
  const updated: DemoRequest = {
    ...existing,
    timeline: [...existing.timeline, { at: now.toISOString(), kind: "viewed" }],
  };
  saveDemoRequest(updated);
  return updated;
}

export function deleteDemoRequest(reference: string): void {
  const normalized = normalizeDemoReference(reference);
  persistDemoRequests(
    readDemoRequests().filter((record) => record.reference !== normalized),
  );
}
