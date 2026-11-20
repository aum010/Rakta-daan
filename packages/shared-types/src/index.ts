/**
 * Shared TypeScript types for Rakta-Daan
 * Used by both NestJS backend and Next.js frontend
 */

// =============================================================================
// ENUMS
// =============================================================================

export enum BloodGroup {
  A_POS = 'A_POS',
  A_NEG = 'A_NEG',
  B_POS = 'B_POS',
  B_NEG = 'B_NEG',
  AB_POS = 'AB_POS',
  AB_NEG = 'AB_NEG',
  O_POS = 'O_POS',
  O_NEG = 'O_NEG',
}

export enum BloodComponent {
  WHOLE_BLOOD = 'whole_blood',
  PRBC = 'prbc',
  PLATELETS = 'platelets',
  PLASMA = 'plasma',
}

export enum Sex {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum AvailabilityState {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  PAUSED = 'paused',
}

export enum Urgency {
  ROUTINE = 'routine',
  URGENT = 'urgent',
  CRITICAL = 'critical',
}

export enum RequestStatus {
  OPEN = 'open',
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum ResponseStatus {
  NOTIFIED = 'notified',
  VIEWED = 'viewed',
  INTERESTED = 'interested',
  DECLINED = 'declined',
  DONATED = 'donated',
  NO_SHOW = 'no_show',
  WITHDRAWN = 'withdrawn',
}

export enum Channel {
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  IN_APP = 'in_app',
}

export enum OrgType {
  HOSPITAL = 'hospital',
  BLOOD_BANK = 'blood_bank',
  RED_CROSS = 'red_cross',
  NGO = 'ngo',
  CAMP_ORGANIZER = 'camp_organizer',
}

export enum VerificationState {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

// =============================================================================
// DTOs
// =============================================================================

export interface CreateDonorDto {
  bloodGroup: BloodGroup;
  sex: Sex;
  dateOfBirth: string;
  weightKg?: number;
  provinceCode: string;
  districtCode: string;
  municipality?: string;
  ward?: string;
  consentAlerts: boolean;
  consentSms: boolean;
  consentWhatsapp: boolean;
}

export interface UpdateDonorDto {
  bloodGroup?: BloodGroup;
  sex?: Sex;
  dateOfBirth?: string;
  weightKg?: number;
  provinceCode?: string;
  districtCode?: string;
  municipality?: string;
  ward?: string;
  availability?: AvailabilityState;
}

export interface CreateBloodRequestDto {
  bloodGroupNeeded: BloodGroup;
  component?: BloodComponent;
  unitsNeeded?: number;
  urgency?: Urgency;
  provinceCode: string;
  districtCode: string;
  hospitalName: string;
  hospitalOrgId?: string;
  neededBy: string;
  contactName: string;
  contactPhone: string;
  patientReference?: string;
  clinicalNote?: string;
  shareContactPublicly?: boolean;
}

export interface UpdateAvailabilityDto {
  availability: AvailabilityState;
}

export interface RespondToRequestDto {
  status: 'interested' | 'declined';
  note?: string;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface DonorSearchResult {
  id: string;
  name: string;
  bloodGroup: BloodGroup;
  distance: number;
  availability: AvailabilityState;
}

export interface BloodRequestSummary {
  id: string;
  publicId: string;
  bloodGroupNeeded: BloodGroup;
  component: BloodComponent;
  unitsNeeded: number;
  urgency: Urgency;
  hospitalName: string;
  districtCode: string;
  status: RequestStatus;
  neededBy: string;
  createdAt: string;
}
