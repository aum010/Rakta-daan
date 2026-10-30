export const POLICY_VERSION = "2026-10";

export const DONOR_MIN_AGE = 18;
export const DONOR_MAX_AGE = 65;
export const DONOR_MIN_WEIGHT_KG = 45;
/** Nepal practice: a minimum interval of 3 months between whole-blood donations. */
export const DONATION_COOLDOWN_DAYS = 90;
/** A self-reported "available" flag goes stale after this many days. */
export const AVAILABILITY_FRESH_DAYS = 30;

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const SESSION_TTL_DAYS = 30;

/** Default search radius used by matching and the public search UI. */
export const DEFAULT_RADIUS_KM = 75;
export const MAX_RADIUS_KM = 250;
export const MAX_DONORS_NOTIFIED_PER_REQUEST = 50;

export const REQUEST_EXPIRY_HOURS: Record<"routine" | "urgent" | "critical", number> = {
  routine: 168,
  urgent: 72,
  critical: 24,
};

export const INVENTORY_STALE_HOURS = 48;

export const RATE_LIMITS = {
  otpRequestPerPhone: { limit: 5, windowSeconds: 3600 },
  otpRequestPerIp: { limit: 20, windowSeconds: 3600 },
  otpVerifyPerPhone: { limit: 10, windowSeconds: 900 },
  registerPerIp: { limit: 10, windowSeconds: 3600 },
  requestCreatePerUser: { limit: 6, windowSeconds: 3600 },
  requestCreatePerIp: { limit: 20, windowSeconds: 3600 },
  donorSearchPerIp: { limit: 120, windowSeconds: 600 },
  responsePerUser: { limit: 30, windowSeconds: 3600 },
  orgInventoryPerUser: { limit: 120, windowSeconds: 3600 },
  abuseReportPerIp: { limit: 10, windowSeconds: 3600 },
} as const;

export const CAMP_UPCOMING_DAYS = 120;
