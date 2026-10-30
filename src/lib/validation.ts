import { z } from "zod";
import { BLOOD_COMPONENTS, BLOOD_GROUPS, URGENCY_VALUES } from "./blood";
import { DISTRICTS, PROVINCES, isDistrictInProvince } from "@/data/geography";
import { DONOR_MAX_AGE, DONOR_MIN_AGE, MAX_RADIUS_KM } from "./constants";
import { ageInYears } from "./dates";
import { normalizePhone } from "./phone";

export const localeSchema = z.enum(["en", "ne"]);
export type Locale = z.infer<typeof localeSchema>;

export const phoneSchema = z
  .string()
  .trim()
  .min(6, "Enter a phone number.")
  .max(24, "Phone number is too long.")
  .superRefine((value, ctx) => {
    const result = normalizePhone(value);
    if (!result.ok) {
      ctx.addIssue({ code: "custom", message: "Enter a valid phone number." });
    }
  });

export const bloodGroupSchema = z.enum(BLOOD_GROUPS);
export const componentSchema = z.enum(BLOOD_COMPONENTS);
export const urgencySchema = z.enum(URGENCY_VALUES);

const provinceCodeSchema = z
  .string()
  .refine((code) => PROVINCES.some((p) => p.code === code), "Unknown province.");

const districtCodeSchema = z
  .string()
  .refine((code) => DISTRICTS.some((d) => d.code === code), "Unknown district.");

const districtWithinProvince = (data: { provinceCode: string; districtCode: string }) =>
  isDistrictInProvince(data.districtCode, data.provinceCode);

export const otpRequestSchema = z.object({
  phone: phoneSchema,
  locale: localeSchema.optional(),
});

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
  name: z.string().trim().min(2, "Enter your name.").max(80).optional(),
  locale: localeSchema.optional(),
  acceptTerms: z.boolean().optional(),
});

export const donorRegistrationSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name.").max(80),
    phone: phoneSchema,
    locale: localeSchema.default("en"),
    bloodGroup: bloodGroupSchema,
    sex: z.enum(["male", "female", "other"]),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
    weightKg: z.coerce.number().int().min(30).max(250).optional(),
    provinceCode: provinceCodeSchema,
    districtCode: districtCodeSchema,
    municipality: z.string().trim().max(80).optional(),
    ward: z.string().trim().max(4).optional(),
    lastDonationDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    consentAlerts: z.literal(true, { message: "Alert consent is required to join." }),
    consentSms: z.boolean().default(false),
    consentWhatsapp: z.boolean().default(false),
    consentContactRelease: z.literal(true, {
      message: "Contact release consent is required to respond to requests.",
    }),
    acceptTerms: z.literal(true, { message: "Please accept the terms." }),
  })
  .superRefine((data, ctx) => {
    if (!districtWithinProvince(data)) {
      ctx.addIssue({
        code: "custom",
        path: ["districtCode"],
        message: "District does not belong to the selected province.",
      });
    }
    const age = ageInYears(data.dateOfBirth);
    if (age < DONOR_MIN_AGE) {
      ctx.addIssue({
        code: "custom",
        path: ["dateOfBirth"],
        message: `Donors must be at least ${DONOR_MIN_AGE}.`,
      });
    }
    if (age > DONOR_MAX_AGE) {
      ctx.addIssue({
        code: "custom",
        path: ["dateOfBirth"],
        message: `Donor registration is limited to age ${DONOR_MAX_AGE} and below.`,
      });
    }
    if (!data.consentSms && !data.consentWhatsapp) {
      ctx.addIssue({
        code: "custom",
        path: ["consentSms"],
        message: "Choose at least one messaging channel.",
      });
    }
    if (data.lastDonationDate && new Date(data.lastDonationDate) > new Date()) {
      ctx.addIssue({
        code: "custom",
        path: ["lastDonationDate"],
        message: "Last donation date cannot be in the future.",
      });
    }
  });

export const donorUpdateSchema = z
  .object({
    availability: z.enum(["available", "unavailable", "paused"]).optional(),
    provinceCode: provinceCodeSchema.optional(),
    districtCode: districtCodeSchema.optional(),
    municipality: z.string().trim().max(80).nullable().optional(),
    ward: z.string().trim().max(4).nullable().optional(),
    lastDonationDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    deferredUntil: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    deferralReason: z.string().trim().max(200).nullable().optional(),
    consentAlerts: z.boolean().optional(),
    consentSms: z.boolean().optional(),
    consentWhatsapp: z.boolean().optional(),
    consentContactRelease: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.provinceCode && data.districtCode && !districtWithinProvince(data as never)) {
      ctx.addIssue({
        code: "custom",
        path: ["districtCode"],
        message: "District does not belong to the selected province.",
      });
    }
    if (data.consentSms === false && data.consentWhatsapp === false) {
      ctx.addIssue({
        code: "custom",
        path: ["consentSms"],
        message: "Keep at least one channel enabled or pause alerts.",
      });
    }
  });

export const requestCreateSchema = z
  .object({
    bloodGroupNeeded: bloodGroupSchema,
    component: componentSchema.default("whole_blood"),
    unitsNeeded: z.coerce.number().int().min(1).max(10).default(1),
    urgency: urgencySchema.default("urgent"),
    provinceCode: provinceCodeSchema,
    districtCode: districtCodeSchema,
    hospitalName: z.string().trim().min(3, "Enter the hospital or facility.").max(160),
    neededBy: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date/time."),
    contactName: z.string().trim().min(2).max(80),
    contactPhone: phoneSchema,
    patientReference: z.string().trim().max(80).optional(),
    clinicalNote: z.string().trim().max(500).optional(),
    shareContactPublicly: z.boolean().default(false),
    notifyRadiusKm: z.coerce.number().int().min(5).max(MAX_RADIUS_KM).default(75),
  })
  .superRefine((data, ctx) => {
    if (!districtWithinProvince(data)) {
      ctx.addIssue({
        code: "custom",
        path: ["districtCode"],
        message: "District does not belong to the selected province.",
      });
    }
    const neededBy = new Date(data.neededBy).getTime();
    if (neededBy < Date.now() - 3_600_000) {
      ctx.addIssue({
        code: "custom",
        path: ["neededBy"],
        message: "Choose a time in the future.",
      });
    }
    if (neededBy > Date.now() + 1000 * 60 * 60 * 24 * 60) {
      ctx.addIssue({
        code: "custom",
        path: ["neededBy"],
        message: "Choose a time within the next 60 days.",
      });
    }
  });

export const responseActionSchema = z.object({
  action: z.enum(["interested", "declined", "donated", "withdrawn"]),
  note: z.string().trim().max(400).optional(),
});

export const requestStatusSchema = z.object({
  status: z.enum(["fulfilled", "cancelled"]),
  reason: z.string().trim().max(200).optional(),
});

export const inventoryUpdateSchema = z.object({
  updates: z
    .array(
      z.object({
        bloodGroup: bloodGroupSchema,
        component: componentSchema.default("whole_blood"),
        units: z.coerce.number().int().min(0).max(999),
        note: z.string().trim().max(160).optional(),
      }),
    )
    .min(1)
    .max(64),
});

export const orgVerificationSchema = z.object({
  action: z.enum(["verify", "reject", "suspend"]),
  note: z.string().trim().max(300).optional(),
});

export const abuseReportSchema = z.object({
  requestPublicId: z.string().trim().max(14).optional(),
  reason: z.enum(["fake_request", "harassment", "spam", "wrong_information", "other"]),
  details: z.string().trim().max(1000).optional(),
  contact: z.string().trim().max(120).optional(),
});

export const campSchema = z.object({
  title: z.string().trim().min(3).max(120),
  titleNe: z.string().trim().max(120).optional(),
  description: z.string().trim().max(600).optional(),
  provinceCode: provinceCodeSchema,
  districtCode: districtCodeSchema,
  venue: z.string().trim().min(3).max(160),
  organizerName: z.string().trim().min(2).max(120),
  contactPhone: phoneSchema.optional(),
  startsAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid start."),
  endsAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid end."),
});

export const availabilityQuerySchema = z.object({
  group: bloodGroupSchema,
  district: districtCodeSchema,
  radiusKm: z.coerce.number().int().min(5).max(MAX_RADIUS_KM).default(75),
});

export const outboxRunSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
