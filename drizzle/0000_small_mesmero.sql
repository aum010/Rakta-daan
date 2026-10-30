CREATE TYPE "public"."abuse_status" AS ENUM('open', 'reviewing', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."availability_state" AS ENUM('available', 'unavailable', 'paused');--> statement-breakpoint
CREATE TYPE "public"."blood_component" AS ENUM('whole_blood', 'prbc', 'platelets', 'plasma');--> statement-breakpoint
CREATE TYPE "public"."blood_group" AS ENUM('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG');--> statement-breakpoint
CREATE TYPE "public"."camp_status" AS ENUM('scheduled', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('sms', 'whatsapp', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."consent_kind" AS ENUM('terms', 'donor_alerts', 'channel_sms', 'channel_whatsapp', 'contact_release_on_response');--> statement-breakpoint
CREATE TYPE "public"."donor_verification" AS ENUM('phone_verified', 'id_reviewed');--> statement-breakpoint
CREATE TYPE "public"."inventory_source" AS ENUM('manual', 'api_feed');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."org_member_role" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."org_type" AS ENUM('hospital', 'blood_bank', 'red_cross', 'ngo', 'camp_organizer');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('open', 'fulfilled', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."response_status" AS ENUM('notified', 'viewed', 'interested', 'declined', 'donated', 'no_show', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."urgency" AS ENUM('routine', 'urgent', 'critical');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."verification_state" AS ENUM('unverified', 'pending', 'verified', 'rejected', 'suspended');--> statement-breakpoint
CREATE TABLE "abuse_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid,
	"reporter_user_id" uuid,
	"reason" varchar(40) NOT NULL,
	"details" text,
	"contact_enc" text,
	"status" "abuse_status" DEFAULT 'open' NOT NULL,
	"resolution_note" text,
	"resolved_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"actor_role" varchar(32),
	"action" varchar(64) NOT NULL,
	"entity_type" varchar(40),
	"entity_id" text,
	"metadata" jsonb,
	"ip_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blood_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"blood_group" "blood_group" NOT NULL,
	"component" "blood_component" DEFAULT 'whole_blood' NOT NULL,
	"units" integer DEFAULT 0 NOT NULL,
	"source" "inventory_source" DEFAULT 'manual' NOT NULL,
	"note" text,
	"updated_by_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blood_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" varchar(14) NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"blood_group_needed" "blood_group" NOT NULL,
	"component" "blood_component" DEFAULT 'whole_blood' NOT NULL,
	"units_needed" integer DEFAULT 1 NOT NULL,
	"urgency" "urgency" DEFAULT 'urgent' NOT NULL,
	"province_code" varchar(8) NOT NULL,
	"district_code" varchar(12) NOT NULL,
	"hospital_name" text NOT NULL,
	"hospital_org_id" uuid,
	"needed_by" timestamp with time zone NOT NULL,
	"contact_name" text NOT NULL,
	"contact_phone_enc" text NOT NULL,
	"contact_phone_masked" varchar(24) NOT NULL,
	"patient_reference_enc" text,
	"clinical_note" text,
	"status" "request_status" DEFAULT 'open' NOT NULL,
	"share_contact_publicly" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"close_reason" text
);
--> statement-breakpoint
CREATE TABLE "camps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"slug" varchar(100) NOT NULL,
	"title" text NOT NULL,
	"title_ne" text,
	"description" text,
	"description_ne" text,
	"province_code" varchar(8) NOT NULL,
	"district_code" varchar(12) NOT NULL,
	"venue" text NOT NULL,
	"organizer_name" text NOT NULL,
	"contact_phone" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "camp_status" DEFAULT 'scheduled' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"code" varchar(12) PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_ne" text NOT NULL,
	"province_code" varchar(8) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donor_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"donor_id" uuid NOT NULL,
	"kind" "consent_kind" NOT NULL,
	"granted" boolean NOT NULL,
	"policy_version" varchar(16) NOT NULL,
	"ip_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"blood_group" "blood_group" NOT NULL,
	"sex" "sex" NOT NULL,
	"date_of_birth" date NOT NULL,
	"weight_kg" integer,
	"province_code" varchar(8) NOT NULL,
	"district_code" varchar(12) NOT NULL,
	"municipality" text,
	"ward" varchar(4),
	"availability" "availability_state" DEFAULT 'available' NOT NULL,
	"availability_confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_donation_date" date,
	"deferred_until" date,
	"deferral_reason" text,
	"consent_alerts" boolean DEFAULT false NOT NULL,
	"consent_sms" boolean DEFAULT false NOT NULL,
	"consent_whatsapp" boolean DEFAULT false NOT NULL,
	"consent_version" varchar(16) DEFAULT 'v1' NOT NULL,
	"verification" "donor_verification" DEFAULT 'phone_verified' NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" varchar(120) NOT NULL,
	"channel" "channel" NOT NULL,
	"template" varchar(60) NOT NULL,
	"recipient_user_id" uuid,
	"donor_id" uuid,
	"request_id" uuid,
	"to_phone_hash" varchar(64) NOT NULL,
	"status" "message_status" DEFAULT 'queued' NOT NULL,
	"provider" varchar(32),
	"provider_message_id" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error_code" varchar(64),
	"error_message" text,
	"payload" jsonb,
	"consent_snapshot" jsonb,
	"scheduled_for" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opt_outs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_hash" varchar(64) NOT NULL,
	"channel" "channel",
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "org_member_role" DEFAULT 'editor' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" text NOT NULL,
	"name_ne" text,
	"type" "org_type" NOT NULL,
	"verification" "verification_state" DEFAULT 'unverified' NOT NULL,
	"verification_note" text,
	"verified_at" timestamp with time zone,
	"verified_by_user_id" uuid,
	"province_code" varchar(8) NOT NULL,
	"district_code" varchar(12) NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"website" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_hash" varchar(64) NOT NULL,
	"purpose" varchar(32) DEFAULT 'login' NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"ip_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "provinces" (
	"code" varchar(8) PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_ne" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"bucket" varchar(60) NOT NULL,
	"key" varchar(80) NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"donor_id" uuid NOT NULL,
	"status" "response_status" DEFAULT 'notified' NOT NULL,
	"respond_token" varchar(40) NOT NULL,
	"match_score" integer DEFAULT 0 NOT NULL,
	"distance_km" double precision,
	"donor_note" text,
	"notified_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"user_agent" text,
	"ip_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_hash" varchar(64) NOT NULL,
	"phone_enc" text NOT NULL,
	"phone_masked" varchar(24) NOT NULL,
	"name" text NOT NULL,
	"locale" varchar(2) DEFAULT 'en' NOT NULL,
	"email" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"phone_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_request_id_blood_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."blood_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_inventory" ADD CONSTRAINT "blood_inventory_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_inventory" ADD CONSTRAINT "blood_inventory_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_requests" ADD CONSTRAINT "blood_requests_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_requests" ADD CONSTRAINT "blood_requests_province_code_provinces_code_fk" FOREIGN KEY ("province_code") REFERENCES "public"."provinces"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_requests" ADD CONSTRAINT "blood_requests_district_code_districts_code_fk" FOREIGN KEY ("district_code") REFERENCES "public"."districts"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_requests" ADD CONSTRAINT "blood_requests_hospital_org_id_organizations_id_fk" FOREIGN KEY ("hospital_org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camps" ADD CONSTRAINT "camps_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camps" ADD CONSTRAINT "camps_province_code_provinces_code_fk" FOREIGN KEY ("province_code") REFERENCES "public"."provinces"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camps" ADD CONSTRAINT "camps_district_code_districts_code_fk" FOREIGN KEY ("district_code") REFERENCES "public"."districts"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_province_code_provinces_code_fk" FOREIGN KEY ("province_code") REFERENCES "public"."provinces"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor_consents" ADD CONSTRAINT "donor_consents_donor_id_donors_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donors" ADD CONSTRAINT "donors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donors" ADD CONSTRAINT "donors_province_code_provinces_code_fk" FOREIGN KEY ("province_code") REFERENCES "public"."provinces"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donors" ADD CONSTRAINT "donors_district_code_districts_code_fk" FOREIGN KEY ("district_code") REFERENCES "public"."districts"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_donor_id_donors_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_request_id_blood_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."blood_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_province_code_provinces_code_fk" FOREIGN KEY ("province_code") REFERENCES "public"."provinces"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_district_code_districts_code_fk" FOREIGN KEY ("district_code") REFERENCES "public"."districts"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_responses" ADD CONSTRAINT "request_responses_request_id_blood_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."blood_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_responses" ADD CONSTRAINT "request_responses_donor_id_donors_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "abuse_status_idx" ON "abuse_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "audit_entities_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "blood_inventory_unique_idx" ON "blood_inventory" USING btree ("org_id","blood_group","component");--> statement-breakpoint
CREATE INDEX "blood_inventory_group_idx" ON "blood_inventory" USING btree ("blood_group");--> statement-breakpoint
CREATE UNIQUE INDEX "blood_requests_public_id_idx" ON "blood_requests" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "blood_requests_match_idx" ON "blood_requests" USING btree ("status","district_code","blood_group_needed");--> statement-breakpoint
CREATE INDEX "blood_requests_creator_idx" ON "blood_requests" USING btree ("created_by_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "blood_requests_open_dedupe_idx" ON "blood_requests" USING btree ("created_by_user_id","district_code","blood_group_needed") WHERE status = 'open';--> statement-breakpoint
CREATE UNIQUE INDEX "camps_slug_idx" ON "camps" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "camps_start_idx" ON "camps" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "districts_province_idx" ON "districts" USING btree ("province_code");--> statement-breakpoint
CREATE INDEX "donor_consents_donor_idx" ON "donor_consents" USING btree ("donor_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "donors_user_idx" ON "donors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "donors_match_idx" ON "donors" USING btree ("blood_group","district_code","availability");--> statement-breakpoint
CREATE INDEX "donors_province_idx" ON "donors" USING btree ("province_code");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_idempotency_idx" ON "messages" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "messages_status_idx" ON "messages" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "messages_request_idx" ON "messages" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opt_outs_phone_channel_idx" ON "opt_outs" USING btree ("phone_hash","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "org_members_unique_idx" ON "org_members" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "organizations_district_idx" ON "organizations" USING btree ("district_code");--> statement-breakpoint
CREATE INDEX "organizations_verification_idx" ON "organizations" USING btree ("verification");--> statement-breakpoint
CREATE INDEX "otp_phone_created_idx" ON "otp_codes" USING btree ("phone_hash","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limits_pk" ON "rate_limits" USING btree ("bucket","key","window_start");--> statement-breakpoint
CREATE UNIQUE INDEX "request_responses_unique_idx" ON "request_responses" USING btree ("request_id","donor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "request_responses_token_idx" ON "request_responses" USING btree ("respond_token");--> statement-breakpoint
CREATE INDEX "request_responses_status_idx" ON "request_responses" USING btree ("request_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_idx" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_hash_idx" ON "users" USING btree ("phone_hash");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");