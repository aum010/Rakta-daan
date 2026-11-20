/**
 * Shared Zod validation schemas for Rakta-Daan
 * Used by both NestJS backend and Next.js frontend
 */
import { z } from 'zod';

// =============================================================================
// ENUM SCHEMAS
// =============================================================================

export const BloodGroupSchema = z.enum([
  'A_POS',
  'A_NEG',
  'B_POS',
  'B_NEG',
  'AB_POS',
  'AB_NEG',
  'O_POS',
  'O_NEG',
]);

export const BloodComponentSchema = z.enum([
  'whole_blood',
  'prbc',
  'platelets',
  'plasma',
]);

export const SexSchema = z.enum(['male', 'female', 'other']);

export const AvailabilityStateSchema = z.enum([
  'available',
  'unavailable',
  'paused',
]);

export const UrgencySchema = z.enum(['routine', 'urgent', 'critical']);

export const RequestStatusSchema = z.enum([
  'open',
  'fulfilled',
  'cancelled',
  'expired',
]);

export const ResponseStatusSchema = z.enum([
  'notified',
  'viewed',
  'interested',
  'declined',
  'donated',
  'no_show',
  'withdrawn',
]);

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

export const PhoneSchema = z
  .string()
  .regex(/^9\d{9}$/, 'Phone must be a valid Nepali mobile number (9XXXXXXXXX)');

export const OtpCodeSchema = z
  .string()
  .length(6, 'OTP must be 6 digits')
  .regex(/^\d{6}$/, 'OTP must contain only digits');

export const ProvinceCodeSchema = z.string().length(1, 'Invalid province code');

export const DistrictCodeSchema = z.string().length(4, 'Invalid district code');

export const UuidSchema = z.string().uuid('Invalid UUID format');

export const PublicIdSchema = z
  .string()
  .regex(/^RD[A-Z0-9]{12}$/, 'Invalid public ID format');

// =============================================================================
// REQUEST/RESPONSE SCHEMAS
// =============================================================================

export const OtpRequestSchema = z.object({
  phone: PhoneSchema,
  purpose: z.enum(['login', 'verify']).default('login'),
});

export const OtpVerifySchema = z.object({
  phone: PhoneSchema,
  code: OtpCodeSchema,
});

export const CreateDonorSchema = z.object({
  bloodGroup: BloodGroupSchema,
  sex: SexSchema,
  dateOfBirth: z.string().date(),
  weightKg: z.number().int().min(45).max(200).optional(),
  provinceCode: ProvinceCodeSchema,
  districtCode: DistrictCodeSchema,
  municipality: z.string().max(100).optional(),
  ward: z.string().max(4).optional(),
  consentAlerts: z.boolean(),
  consentSms: z.boolean(),
  consentWhatsapp: z.boolean(),
});

export const UpdateDonorSchema = CreateDonorSchema.partial();

export const UpdateAvailabilitySchema = z.object({
  availability: AvailabilityStateSchema,
});

export const CreateBloodRequestSchema = z.object({
  bloodGroupNeeded: BloodGroupSchema,
  component: BloodComponentSchema.default('whole_blood'),
  unitsNeeded: z.number().int().min(1).max(10).default(1),
  urgency: UrgencySchema.default('urgent'),
  provinceCode: ProvinceCodeSchema,
  districtCode: DistrictCodeSchema,
  hospitalName: z.string().min(1).max(200),
  hospitalOrgId: UuidSchema.optional(),
  neededBy: z.string().datetime(),
  contactName: z.string().min(1).max(100),
  contactPhone: PhoneSchema,
  patientReference: z.string().max(50).optional(),
  clinicalNote: z.string().max(500).optional(),
  shareContactPublicly: z.boolean().default(false),
});

export const RespondToRequestSchema = z.object({
  status: z.enum(['interested', 'declined']),
  note: z.string().max(200).optional(),
});

export const CreateAbuseReportSchema = z.object({
  requestId: UuidSchema.optional(),
  reason: z.string().min(1).max(40),
  details: z.string().max(1000).optional(),
  contact: z.string().max(20).optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type OtpRequestInput = z.infer<typeof OtpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof OtpVerifySchema>;
export type CreateDonorInput = z.infer<typeof CreateDonorSchema>;
export type UpdateDonorInput = z.infer<typeof UpdateDonorSchema>;
export type UpdateAvailabilityInput = z.infer<typeof UpdateAvailabilitySchema>;
export type CreateBloodRequestInput = z.infer<typeof CreateBloodRequestSchema>;
export type RespondToRequestInput = z.infer<typeof RespondToRequestSchema>;
export type CreateAbuseReportInput = z.infer<typeof CreateAbuseReportSchema>;
