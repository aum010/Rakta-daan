import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_REQUEST_STATUSES,
  demoRequestInputSchema,
  type DemoRequestInput,
} from "@/mocks/request";
import { demoDonorInputSchema, type DemoDonorInput } from "@/mocks/donor";
import { isFutureDateTime } from "@/lib/dates";

const NOW = new Date("2026-10-27T09:00:00Z");

function requestInput(overrides: Partial<DemoRequestInput> = {}): DemoRequestInput {
  return {
    bloodGroup: "O_POS",
    component: "whole_blood",
    units: 2,
    urgency: "urgent",
    neededBy: new Date(NOW.getTime() + 8 * 3_600_000).toISOString(),
    hospital: "Demo Teaching Hospital",
    district: "KTM",
    area: "Maharajgunj",
    directions: "",
    contactName: "Demo Requester",
    contactMethod: "phone",
    phone: "9800000000",
    email: "",
    relationship: "family",
    notes: "",
    consentAccuracy: true,
    consentShare: true,
    consentUpdates: false,
    ...overrides,
  };
}

function donorInput(overrides: Partial<DemoDonorInput> = {}): DemoDonorInput {
  return {
    name: "Demo Donor",
    bloodGroup: "O_POS",
    district: "KTM",
    availability: "available",
    channels: { sms: true, whatsapp: false, email: false },
    phone: "9812345678",
    email: "",
    consentAlerts: true,
    consentContact: true,
    consentTerms: true,
    visibility: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("demo request validation", () => {
  it("accepts a complete, future-dated request", () => {
    const parsed = demoRequestInputSchema.safeParse(requestInput());
    expect(parsed.success).toBe(true);
  });

  it("requires both accuracy and sharing consent", () => {
    const noAccuracy = demoRequestInputSchema.safeParse(
      requestInput({ consentAccuracy: false }),
    );
    const noShare = demoRequestInputSchema.safeParse(requestInput({ consentShare: false }));
    expect(noAccuracy.success).toBe(false);
    expect(noShare.success).toBe(false);
    if (!noAccuracy.success) {
      expect(noAccuracy.error.issues.some((issue) => issue.path.includes("consentAccuracy"))).toBe(
        true,
      );
    }
  });

  it("rejects past times and invalid units", () => {
    const past = demoRequestInputSchema.safeParse(
      requestInput({ neededBy: new Date(NOW.getTime() - 2 * 3_600_000).toISOString() }),
    );
    const units = demoRequestInputSchema.safeParse(requestInput({ units: 0 }));
    expect(past.success).toBe(false);
    expect(units.success).toBe(false);
  });

  it("validates the contact method that was chosen", () => {
    const missingPhone = demoRequestInputSchema.safeParse(
      requestInput({ contactMethod: "phone", phone: "" }),
    );
    const missingEmail = demoRequestInputSchema.safeParse(
      requestInput({ contactMethod: "email", email: "" }),
    );
    const validEmail = demoRequestInputSchema.safeParse(
      requestInput({ contactMethod: "email", email: "demo@example.org", phone: "" }),
    );
    expect(missingPhone.success).toBe(false);
    expect(missingEmail.success).toBe(false);
    expect(validEmail.success).toBe(true);
  });

  it("keeps the status vocabulary explicit", () => {
    expect(DEMO_REQUEST_STATUSES).toEqual(["open", "fulfilled", "cancelled", "expired"]);
  });

  it("recognises future datetimes for the wizard guard", () => {
    expect(isFutureDateTime(new Date(NOW.getTime() + 60_000).toISOString())).toBe(true);
    expect(isFutureDateTime(new Date(NOW.getTime() - 60_000).toISOString())).toBe(false);
    expect(isFutureDateTime("")).toBe(false);
    expect(isFutureDateTime("not-a-date")).toBe(false);
  });
});

describe("demo donor validation", () => {
  it("accepts a complete donor with explicit consents", () => {
    expect(demoDonorInputSchema.safeParse(donorInput()).success).toBe(true);
  });

  it("requires every consent that is meaningful for the flow", () => {
    for (const key of ["consentAlerts", "consentContact", "consentTerms"] as const) {
      const parsed = demoDonorInputSchema.safeParse(donorInput({ [key]: false }));
      expect(parsed.success).toBe(false);
    }
  });

  it("requires at least one channel and a phone when SMS is chosen", () => {
    const noChannel = demoDonorInputSchema.safeParse(
      donorInput({ channels: { sms: false, whatsapp: false, email: false } }),
    );
    const smsNoPhone = demoDonorInputSchema.safeParse(
      donorInput({ channels: { sms: true, whatsapp: false, email: false }, phone: "" }),
    );
    const emailOnly = demoDonorInputSchema.safeParse(
      donorInput({
        channels: { sms: false, whatsapp: false, email: true },
        phone: "",
        email: "donor@example.org",
      }),
    );
    expect(noChannel.success).toBe(false);
    expect(smsNoPhone.success).toBe(false);
    expect(emailOnly.success).toBe(true);
  });

  it("rejects malformed contact details", () => {
    const phone = demoDonorInputSchema.safeParse(donorInput({ phone: "12" }));
    const email = demoDonorInputSchema.safeParse(
      donorInput({
        channels: { sms: false, whatsapp: false, email: true },
        phone: "",
        email: "not-an-email",
      }),
    );
    expect(phone.success).toBe(false);
    expect(email.success).toBe(false);
  });

  it("keeps optional visibility separate from required consents", () => {
    const hidden = demoDonorInputSchema.safeParse(donorInput({ visibility: false }));
    expect(hidden.success).toBe(true);
  });
});
