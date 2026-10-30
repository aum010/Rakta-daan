# System architecture

## 1. Overview

```
Browser (mobile-first, en/ne)
   │  HTTPS
   ▼
Next.js 16 (App Router, single deployable)
   ├─ Server components  → public reads (find, banks, camps, request pages)
   ├─ Route handlers     → /api/v1/** (JSON API), /api/webhooks/**, /api/internal/**
   ├─ Session layer      → signed HttpOnly cookie (OTP login)
   └─ Drizzle ORM
         ▼
   PostgreSQL 16  ── outbox → adapters (mock | Sparrow SMS | WhatsApp Cloud API)
         ▲                                   │
         └── cron: /api/internal/outbox ◄───┘  (or `pnpm outbox`)
```

One process, one database, no message broker: the `messages` table **is** the queue.

## 2. Layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| UI | `src/app/[locale]/**`, `src/components/**` | Server-rendered pages, accessible client widgets |
| API | `src/app/api/**` | JSON API with uniform error envelope, CSRF/origin checks, rate limits |
| Domain | `src/lib/*.ts` | Matching, requests lifecycle, consent, geo, blood rules, validation |
| Messaging | `src/lib/messaging/*` | Templates, provider adapters, outbox dispatch |
| Data | `src/db/schema.ts`, `src/db/index.ts` | Schema, enums, connection |
| Crypto/privacy | `src/lib/crypto.ts`, `src/lib/phone.ts` | AES-256-GCM field encryption, HMAC blind index |
| Service layer | `src/services/api.ts` | Single typed entry point for JSON API calls (swap point for future backends) |
| Demo / mock layer | `src/mocks/*`, `src/mocks/fixtures.ts` | Clearly-labelled, browser-local demo flows and synthetic fixtures (never touches the DB) |

## 3. Request lifecycle (real flow)

1. **Requester** logs in with phone OTP (`/api/v1/auth/otp/request` → `verify`).
2. `POST /api/v1/requests` validates input (Zod), encrypts contact phone, stores the request
   as `open`, then runs matching.
3. **Matching** (`src/lib/matching.ts`) selects donors by: compatible component/group rules,
   distance within `notify_radius_km`, availability window, cooldown since last donation,
   non-stale profile, channel consent, no opt-out, no duplicate notify for this request.
4. Each selected donor gets a `messages` row (`queued`, `dedupe_key = request:donor:channel`)
   plus a single-use `respond_token` on `request_responses`.
5. **Cron** (`/api/internal/outbox`, bearer `CRON_SECRET`) dispatches `queued` rows through
   the configured adapter, updates states truthfully, expires stale requests, runs retention.
6. Donor taps the capability link `/respond/[token]` → `POST /api/v1/responses/[token]` with
   `interested | unavailable`. Only after `interested` does the requester see donor contact,
   and only on the owner's dashboard.
7. Requester closes the request (`close`) → contact fields are wiped by retention on the next
   cron run; audit events are written for every state change.

## 4. Database schema (ERD)

PostgreSQL. Enums are real PG enums (see `src/db/schema.ts`).

```
users ──< sessions
  │ └──< otp_codes
  ├──< donors ──< donor_consents
  │        │  └──< request_responses >── blood_requests
  │        └──< opt_outs
  ├──< blood_requests ──< messages
  │        │
  │        └──< abuse_reports
  ├──< organizations ──< org_members
  │        ├──< blood_inventory
  │        └──< camps
  └──< audit_events
rate_limits           (keyed counters)
provinces, districts  (geography reference data)
```

Key tables:

| Table | Purpose | Privacy note |
| --- | --- | --- |
| `users` | Login identities (phone hash + encrypted phone), role | Phone encrypted + blind-indexed |
| `sessions` | Signed sessions, expiry, revocation | Rotated on login, revoked on logout |
| `otp_codes` | Hashed OTP codes, attempts, expiry | Only peppered hashes stored |
| `donors` | Profile: group, sex, location, availability window, last donation, verification | Public queries return aggregates only |
| `donor_consents` | Per-donor consent per channel/kind, timestamp, source | Auditable |
| `opt_outs` | Phone-level STOP | Enforced at send time |
| `organizations` / `org_members` | Orgs, roles (`owner/editor/viewer`), verification state | Verification never implied clinically |
| `blood_inventory` | Units per group/component, `source`, `updated_at`, `reported_by` | Shown with freshness or `unknown` |
| `blood_requests` | Public id, status, urgency, encrypted contact, consents, expiry | Contact + patient ref encrypted |
| `request_responses` | Donor response per request, single-use `respond_token` | Token is capability-based |
| `messages` | Outbox rows: channel, template, state, attempts, `dedupe_key` | No message bodies in logs |
| `camps` | Camps with schedule/location/status | Public |
| `audit_events` | actor, action, entity, ip/ua, jsonb detail | Append-only |
| `rate_limits` | Fixed-window counters per key | No personal data |
| `abuse_reports` | Reports against requests/donors, triage state | Admin-only |

Schema source of truth: [`src/db/schema.ts`](../src/db/schema.ts); migrations in
[`drizzle/`](../../drizzle). ERD is generated from the schema by reading this file — no
binary diagram tooling is required.

## 5. Matching rules (deterministic)

A donor is selected only when **all** hold:

1. Blood group is compatible with the recipient group (component-aware, `src/lib/blood.ts`).
2. Within the request's radius (`notify_radius_km`) of the request district.
3. `availability = available` and the request falls inside the donor's availability window.
4. Cooldown since `last_donation_at` ≥ configured minimum (when provided).
5. Profile not stale (older than the staleness window).
6. Consent exists for the channel being used; no `opt_outs` row.
7. No existing message for this `(request, donor, channel)` — enforced by `dedupe_key`.

Results are *ranked*, never *guaranteed*, and uncertainty (distance, freshness) is surfaced
in the UI. No medical compatibility guarantee is displayed anywhere.

## 6. Security controls in the request path

* All mutations: session check + role/ownership check + same-origin check (`Origin` header)
  + rate limit + audit event.
* All reads: only fields the caller is entitled to; public endpoints return aggregates or
  explicitly public fields.
* Error envelope: `{ error: { code, message, details? } }`, 4xx without stack traces.

## 7. Failure modes

| Failure | Behaviour |
| --- | --- |
| DB down | Health endpoint fails; pages render an error state, never a blank screen |
| Provider down | Messages stay `queued`, retried by cron with attempt counting; visible in outbox |
| No provider configured | Adapter returns `simulated` — shown as *simulated*, never *delivered* |
| Double cron run | `dedupe_key` + state machine prevent duplicate sends |
| Expired request | Auto-`expired` by cron; contact fields wiped; page shows expired state |
