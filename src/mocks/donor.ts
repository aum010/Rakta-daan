import { z } from "zod";
import { BLOOD_GROUPS } from "@/lib/blood";
import { DISTRICTS } from "@/data/geography";
import { readJson, removeStored, writeJson } from "./storage";

export const DEMO_DONOR_KEY = "rakta-daan:demo-donor:v1";
export const DEMO_DONOR_RESPONSES_KEY = "rakta-daan:demo-donor-responses:v1";

export const DONOR_AVAILABILITY = ["available", "unavailable", "paused"] as const;
export type DemoDonorAvailability = (typeof DONOR_AVAILABILITY)[number];

const districtCodes = DISTRICTS.map((district) => district.code);
const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

export const demoDonorInputSchema = z
  .object({
    name: z.string().trim().min(2, "Enter a name or preferred name.").max(80),
    bloodGroup: z.enum([...BLOOD_GROUPS, "not_sure"]),
    district: z.enum(districtCodes as [string, ...string[]]),
    availability: z.enum(DONOR_AVAILABILITY),
    channels: z.object({
      sms: z.boolean(),
      whatsapp: z.boolean(),
      email: z.boolean(),
    }),
    phone: optionalText(24),
    email: optionalText(160),
    consentAlerts: z.boolean(),
    consentContact: z.boolean(),
    consentTerms: z.boolean(),
    visibility: z.boolean(),
  })
  .superRefine((value, context) => {
    if (!value.consentAlerts) {
      context.addIssue({
        code: "custom",
        path: ["consentAlerts"],
        message: "Agree to be contacted before creating a donor profile.",
      });
    }
    if (!value.consentContact) {
      context.addIssue({
        code: "custom",
        path: ["consentContact"],
        message: "Confirm when your contact details may be shared.",
      });
    }
    if (!value.consentTerms) {
      context.addIssue({
        code: "custom",
        path: ["consentTerms"],
        message: "Confirm that you understand what this demo does and does not do.",
      });
    }
    const { sms, whatsapp, email } = value.channels;
    if (!sms && !whatsapp && !email) {
      context.addIssue({
        code: "custom",
        path: ["channels"],
        message: "Choose at least one contact channel.",
      });
    }
    if ((sms || whatsapp) && !value.phone) {
      context.addIssue({
        code: "custom",
        path: ["phone"],
        message: "A phone number is needed for SMS or WhatsApp.",
      });
    } else if (
      value.phone &&
      !/^[+\d][\d\s-]{6,23}$/.test(value.phone)
    ) {
      context.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Enter a valid phone number.",
      });
    }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.email ?? "")) {
      context.addIssue({
        code: "custom",
        path: ["email"],
        message: "Enter a valid email address.",
      });
    }
  });

export type DemoDonorInput = z.infer<typeof demoDonorInputSchema>;

export type DemoDonor = DemoDonorInput & {
  createdAt: string;
  updatedAt: string;
  availabilityUpdatedAt: string;
};

export function createDemoDonor(
  input: DemoDonorInput,
  now: Date = new Date(),
): DemoDonor {
  return {
    ...input,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    availabilityUpdatedAt: now.toISOString(),
  };
}

export function readDemoDonor(): DemoDonor | null {
  const stored = readJson<DemoDonor | null>(DEMO_DONOR_KEY, null);
  if (!stored || typeof stored !== "object" || typeof stored.name !== "string") {
    return null;
  }
  return stored;
}

export function saveDemoDonor(donor: DemoDonor): boolean {
  return writeJson(DEMO_DONOR_KEY, donor);
}

export function updateDemoDonor(
  patch: Partial<DemoDonorInput>,
  now: Date = new Date(),
): DemoDonor | null {
  const existing = readDemoDonor();
  if (!existing) return null;
  const availabilityChanged =
    patch.availability !== undefined && patch.availability !== existing.availability;
  const updated: DemoDonor = {
    ...existing,
    ...patch,
    channels: patch.channels ? { ...existing.channels, ...patch.channels } : existing.channels,
    updatedAt: now.toISOString(),
    availabilityUpdatedAt: availabilityChanged
      ? now.toISOString()
      : existing.availabilityUpdatedAt,
  };
  saveDemoDonor(updated);
  return updated;
}

export function deleteDemoDonor(): void {
  removeStored(DEMO_DONOR_KEY);
}

export function calculateProfileCompletion(donor: DemoDonorInput): number {
  let score = 0;
  if (donor.name.trim().length >= 2) score += 15;
  if (donor.bloodGroup) score += 15;
  if (donor.district) score += 10;
  if (donor.phone || donor.email) score += 15;
  if (donor.availability) score += 15;
  if (donor.channels.sms || donor.channels.whatsapp || donor.channels.email) score += 10;
  if (donor.consentAlerts && donor.consentContact && donor.consentTerms) score += 20;
  return Math.min(100, score);
}

export type DemoDonorResponse = {
  reference: string;
  response: "interested" | "declined";
  at: string;
};

export function readDemoResponses(): DemoDonorResponse[] {
  const stored = readJson<DemoDonorResponse[]>(DEMO_DONOR_RESPONSES_KEY, []);
  return Array.isArray(stored)
    ? stored.filter(
        (item) =>
          item &&
          typeof item.reference === "string" &&
          (item.response === "interested" || item.response === "declined"),
      )
    : [];
}

export function saveDemoResponse(
  reference: string,
  response: DemoDonorResponse["response"],
): DemoDonorResponse[] {
  const existing = readDemoResponses().filter((item) => item.reference !== reference);
  const next = [
    { reference, response, at: new Date().toISOString() },
    ...existing,
  ].slice(0, 20);
  writeJson(DEMO_DONOR_RESPONSES_KEY, next);
  return next;
}
