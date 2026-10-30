import { describe, expect, it } from "vitest";
import { donorRegistrationSchema, requestCreateSchema } from "@/lib/validation";

const validDonor = {
  name: "Sita Sharma",
  phone: "9801234567",
  locale: "en",
  bloodGroup: "A_POS",
  sex: "female",
  dateOfBirth: "1995-04-12",
  weightKg: 58,
  provinceCode: "P3",
  districtCode: "KTM",
  consentAlerts: true,
  consentSms: true,
  consentWhatsapp: false,
  consentContactRelease: true,
  acceptTerms: true,
};

describe("donor registration validation", () => {
  it("accepts a valid registration", () => {
    expect(donorRegistrationSchema.safeParse(validDonor).success).toBe(true);
  });

  it("rejects minors and over-age donors", () => {
    const minor = donorRegistrationSchema.safeParse({
      ...validDonor,
      dateOfBirth: new Date(Date.now() - 16 * 365.25 * 86_400_000).toISOString().slice(0, 10),
    });
    expect(minor.success).toBe(false);

    const overAge = donorRegistrationSchema.safeParse({ ...validDonor, dateOfBirth: "1940-01-01" });
    expect(overAge.success).toBe(false);
  });

  it("requires at least one message channel", () => {
    const result = donorRegistrationSchema.safeParse({
      ...validDonor,
      consentSms: false,
      consentWhatsapp: false,
    });
    expect(result.success).toBe(false);
  });

  it("requires alert, contact and terms consent", () => {
    for (const key of ["consentAlerts", "consentContactRelease", "acceptTerms"]) {
      const result = donorRegistrationSchema.safeParse({ ...validDonor, [key]: false });
      expect(result.success, key).toBe(false);
    }
  });

  it("rejects a district outside the selected province", () => {
    const result = donorRegistrationSchema.safeParse({
      ...validDonor,
      provinceCode: "P1",
      districtCode: "KTM",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid phone number", () => {
    expect(donorRegistrationSchema.safeParse({ ...validDonor, phone: "123" }).success).toBe(false);
  });
});

const validRequest = {
  bloodGroupNeeded: "O_POS",
  component: "whole_blood",
  unitsNeeded: 2,
  urgency: "urgent",
  provinceCode: "P3",
  districtCode: "KTM",
  hospitalName: "Teaching Hospital",
  neededBy: new Date(Date.now() + 6 * 3_600_000).toISOString(),
  contactName: "Ram",
  contactPhone: "9812345678",
  notifyRadiusKm: 75,
};

describe("blood request validation", () => {
  it("accepts a valid future request", () => {
    expect(requestCreateSchema.safeParse(validRequest).success).toBe(true);
  });

  it("rejects a time in the past", () => {
    const result = requestCreateSchema.safeParse({
      ...validRequest,
      neededBy: new Date(Date.now() - 86_400_000).toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it("rejects an implausibly distant time", () => {
    const result = requestCreateSchema.safeParse({
      ...validRequest,
      neededBy: new Date(Date.now() + 90 * 86_400_000).toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it("limits units and radius", () => {
    expect(requestCreateSchema.safeParse({ ...validRequest, unitsNeeded: 50 }).success).toBe(false);
    expect(requestCreateSchema.safeParse({ ...validRequest, notifyRadiusKm: 900 }).success).toBe(
      false,
    );
  });

  it("rejects mismatched province and district", () => {
    const result = requestCreateSchema.safeParse({
      ...validRequest,
      provinceCode: "P7",
      districtCode: "KTM",
    });
    expect(result.success).toBe(false);
  });
});
