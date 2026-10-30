/**
 * Rakta-Daan database schema (PostgreSQL / Drizzle ORM).
 *
 * Privacy posture:
 *  - No plaintext phone number is stored. `phone_enc` is AES-256-GCM ciphertext and
 *    `phone_hash` is a keyed HMAC used for exact-match lookup (a blind index).
 *  - Request contact details and the optional patient reference are encrypted at rest.
 *  - Donor contact details are never exposed by the API; contact happens by relay.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ enums */

export const bloodGroupEnum = pgEnum("blood_group", [
  "A_POS",
  "A_NEG",
  "B_POS",
  "B_NEG",
  "AB_POS",
  "AB_NEG",
  "O_POS",
  "O_NEG",
]);

export const bloodComponentEnum = pgEnum("blood_component", [
  "whole_blood",
  "prbc",
  "platelets",
  "plasma",
]);

export const sexEnum = pgEnum("sex", ["male", "female", "other"]);

export const availabilityEnum = pgEnum("availability_state", [
  "available",
  "unavailable",
  "paused",
]);

export const donorVerificationEnum = pgEnum("donor_verification", [
  "phone_verified",
  "id_reviewed",
]);

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "suspended",
  "deleted",
]);

export const orgTypeEnum = pgEnum("org_type", [
  "hospital",
  "blood_bank",
  "red_cross",
  "ngo",
  "camp_organizer",
]);

export const verificationEnum = pgEnum("verification_state", [
  "unverified",
  "pending",
  "verified",
  "rejected",
  "suspended",
]);

export const orgMemberRoleEnum = pgEnum("org_member_role", [
  "owner",
  "editor",
  "viewer",
]);

export const urgencyEnum = pgEnum("urgency", ["routine", "urgent", "critical"]);

export const requestStatusEnum = pgEnum("request_status", [
  "open",
  "fulfilled",
  "cancelled",
  "expired",
]);

export const responseStatusEnum = pgEnum("response_status", [
  "notified",
  "viewed",
  "interested",
  "declined",
  "donated",
  "no_show",
  "withdrawn",
]);

export const channelEnum = pgEnum("channel", ["sms", "whatsapp", "in_app"]);

export const messageStatusEnum = pgEnum("message_status", [
  "queued",
  "sending",
  "sent",
  "delivered",
  "read",
  "failed",
  "skipped",
]);

export const consentKindEnum = pgEnum("consent_kind", [
  "terms",
  "donor_alerts",
  "channel_sms",
  "channel_whatsapp",
  "contact_release_on_response",
]);

export const inventorySourceEnum = pgEnum("inventory_source", [
  "manual",
  "api_feed",
]);

export const campStatusEnum = pgEnum("camp_status", [
  "scheduled",
  "cancelled",
  "completed",
]);

export const abuseStatusEnum = pgEnum("abuse_status", [
  "open",
  "reviewing",
  "resolved",
  "dismissed",
]);

/* -------------------------------------------------------------- geography */

export const provinces = pgTable("provinces", {
  code: varchar("code", { length: 8 }).primaryKey(),
  nameEn: text("name_en").notNull(),
  nameNe: text("name_ne").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const districts = pgTable(
  "districts",
  {
    code: varchar("code", { length: 12 }).primaryKey(),
    nameEn: text("name_en").notNull(),
    nameNe: text("name_ne").notNull(),
    provinceCode: varchar("province_code", { length: 8 })
      .notNull()
      .references(() => provinces.code),
    // Approximate district-headquarters coordinates, used only for distance ranking.
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
  },
  (t) => [index("districts_province_idx").on(t.provinceCode)],
);

/* ------------------------------------------------------------------ users */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phoneHash: varchar("phone_hash", { length: 64 }).notNull(),
    phoneEnc: text("phone_enc").notNull(),
    phoneMasked: varchar("phone_masked", { length: 24 }).notNull(),
    name: text("name").notNull(),
    locale: varchar("locale", { length: 2 }).notNull().default("en"),
    email: text("email"),
    isAdmin: boolean("is_admin").notNull().default(false),
    status: userStatusEnum("status").notNull().default("active"),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_phone_hash_idx").on(t.phoneHash),
    index("users_email_idx").on(t.email),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    userAgent: text("user_agent"),
    ipHash: varchar("ip_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_idx").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
  ],
);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phoneHash: varchar("phone_hash", { length: 64 }).notNull(),
    purpose: varchar("purpose", { length: 32 }).notNull().default("login"),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    ipHash: varchar("ip_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (t) => [index("otp_phone_created_idx").on(t.phoneHash, t.createdAt)],
);

/* ----------------------------------------------------------------- donors */

export const donors = pgTable(
  "donors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bloodGroup: bloodGroupEnum("blood_group").notNull(),
    sex: sexEnum("sex").notNull(),
    dateOfBirth: date("date_of_birth").notNull(),
    weightKg: integer("weight_kg"),
    provinceCode: varchar("province_code", { length: 8 })
      .notNull()
      .references(() => provinces.code),
    districtCode: varchar("district_code", { length: 12 })
      .notNull()
      .references(() => districts.code),
    municipality: text("municipality"),
    ward: varchar("ward", { length: 4 }),
    availability: availabilityEnum("availability").notNull().default("available"),
    availabilityConfirmedAt: timestamp("availability_confirmed_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    lastDonationDate: date("last_donation_date"),
    deferredUntil: date("deferred_until"),
    deferralReason: text("deferral_reason"),
    consentAlerts: boolean("consent_alerts").notNull().default(false),
    consentSms: boolean("consent_sms").notNull().default(false),
    consentWhatsapp: boolean("consent_whatsapp").notNull().default(false),
    consentVersion: varchar("consent_version", { length: 16 }).notNull().default("v1"),
    verification: donorVerificationEnum("verification").notNull().default("phone_verified"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("donors_user_idx").on(t.userId),
    index("donors_match_idx").on(t.bloodGroup, t.districtCode, t.availability),
    index("donors_province_idx").on(t.provinceCode),
  ],
);

export const donorConsents = pgTable(
  "donor_consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    donorId: uuid("donor_id")
      .notNull()
      .references(() => donors.id, { onDelete: "cascade" }),
    kind: consentKindEnum("kind").notNull(),
    granted: boolean("granted").notNull(),
    policyVersion: varchar("policy_version", { length: 16 }).notNull(),
    ipHash: varchar("ip_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("donor_consents_donor_idx").on(t.donorId, t.createdAt)],
);

/** Global opt-outs keyed by blind phone hash. Survives account deletion. */
export const optOuts = pgTable(
  "opt_outs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phoneHash: varchar("phone_hash", { length: 64 }).notNull(),
    channel: channelEnum("channel"),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("opt_outs_phone_channel_idx").on(t.phoneHash, t.channel)],
);

/* ---------------------------------------------------------- organizations */

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: text("name").notNull(),
    nameNe: text("name_ne"),
    type: orgTypeEnum("type").notNull(),
    verification: verificationEnum("verification").notNull().default("unverified"),
    verificationNote: text("verification_note"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedByUserId: uuid("verified_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    provinceCode: varchar("province_code", { length: 8 })
      .notNull()
      .references(() => provinces.code),
    districtCode: varchar("district_code", { length: 12 })
      .notNull()
      .references(() => districts.code),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    isPublic: boolean("is_public").notNull().default(true),
    /** Seed data created by `pnpm db:seed:demo`. Rendered with a Demo badge. */
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("organizations_slug_idx").on(t.slug),
    index("organizations_district_idx").on(t.districtCode),
    index("organizations_verification_idx").on(t.verification),
  ],
);

export const orgMembers = pgTable(
  "org_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: orgMemberRoleEnum("role").notNull().default("editor"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("org_members_unique_idx").on(t.orgId, t.userId)],
);

export const bloodInventory = pgTable(
  "blood_inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    bloodGroup: bloodGroupEnum("blood_group").notNull(),
    component: bloodComponentEnum("component").notNull().default("whole_blood"),
    units: integer("units").notNull().default(0),
    source: inventorySourceEnum("source").notNull().default("manual"),
    note: text("note"),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("blood_inventory_unique_idx").on(t.orgId, t.bloodGroup, t.component),
    index("blood_inventory_group_idx").on(t.bloodGroup),
  ],
);

/* -------------------------------------------------------------- requests */

export const bloodRequests = pgTable(
  "blood_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: varchar("public_id", { length: 14 }).notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bloodGroupNeeded: bloodGroupEnum("blood_group_needed").notNull(),
    component: bloodComponentEnum("component").notNull().default("whole_blood"),
    unitsNeeded: integer("units_needed").notNull().default(1),
    urgency: urgencyEnum("urgency").notNull().default("urgent"),
    provinceCode: varchar("province_code", { length: 8 })
      .notNull()
      .references(() => provinces.code),
    districtCode: varchar("district_code", { length: 12 })
      .notNull()
      .references(() => districts.code),
    hospitalName: text("hospital_name").notNull(),
    hospitalOrgId: uuid("hospital_org_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    neededBy: timestamp("needed_by", { withTimezone: true }).notNull(),
    contactName: text("contact_name").notNull(),
    /**
     * AES-256-GCM ciphertext. Never returned by any API. Cleared by the
     * retention job once the request has been closed for a week.
     */
    contactPhoneEnc: text("contact_phone_enc"),
    contactPhoneMasked: varchar("contact_phone_masked", { length: 24 }).notNull(),
    /** Optional free-text reference such as a hospital admission number. Encrypted. */
    patientReferenceEnc: text("patient_reference_enc"),
    clinicalNote: text("clinical_note"),
    status: requestStatusEnum("status").notNull().default("open"),
    shareContactPublicly: boolean("share_contact_publicly").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closeReason: text("close_reason"),
  },
  (t) => [
    uniqueIndex("blood_requests_public_id_idx").on(t.publicId),
    index("blood_requests_match_idx").on(t.status, t.districtCode, t.bloodGroupNeeded),
    index("blood_requests_creator_idx").on(t.createdByUserId, t.createdAt),
    // Prevents accidental duplicate live requests for the same district + group.
    uniqueIndex("blood_requests_open_dedupe_idx")
      .on(t.createdByUserId, t.districtCode, t.bloodGroupNeeded)
      .where(sql`status = 'open'`),
  ],
);

export const requestResponses = pgTable(
  "request_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => bloodRequests.id, { onDelete: "cascade" }),
    donorId: uuid("donor_id")
      .notNull()
      .references(() => donors.id, { onDelete: "cascade" }),
    status: responseStatusEnum("status").notNull().default("notified"),
    respondToken: varchar("respond_token", { length: 40 }).notNull(),
    matchScore: integer("match_score").notNull().default(0),
    distanceKm: doublePrecision("distance_km"),
    donorNote: text("donor_note"),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("request_responses_unique_idx").on(t.requestId, t.donorId),
    uniqueIndex("request_responses_token_idx").on(t.respondToken),
    index("request_responses_status_idx").on(t.requestId, t.status),
  ],
);

/* -------------------------------------------------------------- messages */

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    idempotencyKey: varchar("idempotency_key", { length: 120 }).notNull(),
    channel: channelEnum("channel").notNull(),
    template: varchar("template", { length: 60 }).notNull(),
    recipientUserId: uuid("recipient_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    donorId: uuid("donor_id").references(() => donors.id, { onDelete: "set null" }),
    requestId: uuid("request_id").references(() => bloodRequests.id, {
      onDelete: "set null",
    }),
    toPhoneHash: varchar("to_phone_hash", { length: 64 }).notNull(),
    status: messageStatusEnum("status").notNull().default("queued"),
    provider: varchar("provider", { length: 32 }),
    providerMessageId: text("provider_message_id"),
    attempts: integer("attempts").notNull().default(0),
    errorCode: varchar("error_code", { length: 64 }),
    errorMessage: text("error_message"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    /** Consent + opt-out state at enqueue time, kept for auditability. */
    consentSnapshot: jsonb("consent_snapshot").$type<Record<string, unknown>>(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("messages_idempotency_idx").on(t.idempotencyKey),
    index("messages_status_idx").on(t.status, t.scheduledFor),
    index("messages_request_idx").on(t.requestId),
  ],
);

/* ------------------------------------------------------------------ camps */

export const camps = pgTable(
  "camps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "set null" }),
    slug: varchar("slug", { length: 100 }).notNull(),
    title: text("title").notNull(),
    titleNe: text("title_ne"),
    description: text("description"),
    descriptionNe: text("description_ne"),
    provinceCode: varchar("province_code", { length: 8 })
      .notNull()
      .references(() => provinces.code),
    districtCode: varchar("district_code", { length: 12 })
      .notNull()
      .references(() => districts.code),
    venue: text("venue").notNull(),
    organizerName: text("organizer_name").notNull(),
    contactPhone: text("contact_phone"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: campStatusEnum("status").notNull().default("scheduled"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("camps_slug_idx").on(t.slug),
    index("camps_start_idx").on(t.startsAt),
  ],
);

/* ---------------------------------------------------------- ops + safety */

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorRole: varchar("actor_role", { length: 32 }),
    action: varchar("action", { length: 64 }).notNull(),
    entityType: varchar("entity_type", { length: 40 }),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipHash: varchar("ip_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_entities_idx").on(t.entityType, t.entityId),
    index("audit_created_idx").on(t.createdAt),
  ],
);

export const rateLimits = pgTable(
  "rate_limits",
  {
    bucket: varchar("bucket", { length: 60 }).notNull(),
    key: varchar("key", { length: 80 }).notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [uniqueIndex("rate_limits_pk").on(t.bucket, t.key, t.windowStart)],
);

export const abuseReports = pgTable(
  "abuse_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id").references(() => bloodRequests.id, {
      onDelete: "set null",
    }),
    reporterUserId: uuid("reporter_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reason: varchar("reason", { length: 40 }).notNull(),
    details: text("details"),
    contactEnc: text("contact_enc"),
    status: abuseStatusEnum("status").notNull().default("open"),
    resolutionNote: text("resolution_note"),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("abuse_status_idx").on(t.status, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Donor = typeof donors.$inferSelect;
export type BloodRequest = typeof bloodRequests.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type RequestResponse = typeof requestResponses.$inferSelect;
