# Rakta-Daan — Product Requirements Document

## 1. Problem

In Nepal, a family facing an emergency spends critical minutes calling around for blood:
individual donor numbers are scattered across groups and spreadsheets, blood-bank stock is
reported informally, and donor contact details circulate publicly with no consent model.
Existing services are useful but inconsistent in privacy posture, freshness labelling and
accessibility.

## 2. Product promise

> **Find blood fast. Connect responsibly. Save time when every minute matters.**

Optimised for: first interaction, search initiation, useful results, and honest notification
dispatch. We do **not** promise that blood itself will always be found.

## 3. Definition (non-negotiable)

A **website-first** platform. No Flutter/React Native/native app, no app-store deliverables.
Shareable request links, responsive web design and official messaging integrations instead.

## 4. Primary market

Nepal: seven provinces, 77 districts, local levels, ward-level addresses where genuinely
needed, Nepali + English, Nepal phone numbers, Nepal-local date/time, mobile-first and
low-bandwidth friendly. Geography is stored as reference data (`provinces`, `districts`
tables + `src/data/geography.ts`), not hard-coded in components.

## 5. Users

| Persona | Need |
| --- | --- |
| Requester (family member) | Start finding help in seconds, on a phone, possibly on 2G |
| Registered donor | Receive *only* relevant requests, control availability and channels |
| Hospital / blood bank | Publish contact + inventory with freshness and verification state |
| Camp organiser | Publish donation camps |
| Administrator | Verify organisations, triage abuse, audit without blanket private-data access |

See `docs/research/user-personas.md`.

## 6. Functional requirements

### 6.1 Search and discovery
- **F1** Search donors/banks by blood group, district, radius; "not sure" path explains
  compatibility in plain language instead of guessing.
- **F2** Nearby blood banks with distance, contact, verification state and inventory
  freshness (including `unknown`/`stale`).
- **F3** Blood donation camp directory.
- **F4** Public, shareable request page at `/requests/[publicId]` (no login to read).

### 6.2 Requests
- **F5** Authenticated requester creates a request: blood group needed, component, units,
  urgency, location (province/district/hospital), needed-by, contact preference, consents.
- **F6** Duplicate suppression, status lifecycle (`open → fulfilled | cancelled | expired`),
  owner-only close/edit, automatic expiry.
- **F7** Notify matching donors **only** when matching rules, cooldown, radius, availability
  and consent all pass; never expose donor identity in results.

### 6.3 Donors
- **F8** OTP registration with blood group, sex, location, availability window, channels.
- **F9** Donor controls availability, pause, consent and channel preferences; donors respond
  through a single-use token link — contact details are exchanged only after a response.
- **F10** Cooldown/last-donation handling and stale-profile handling.

### 6.4 Organisations
- **F11** Org staff (role-based `orgMembers`) maintain inventory; every update is audited
  and stamped with freshness; public shows source + `updated_at`.
- **F12** Admin verifies organisations, manages camps, triages abuse reports — with audit
  events and no unrestricted access to private user data.

### 6.5 Messaging
- **F13** Outbox with truthful states (`queued → sent → delivered | failed`, or
  `simulated` when no provider is configured), idempotency, opt-out enforcement,
  retry/inspection, and a cron dispatcher.
- **F14** Inbound STOP/START opt-out webhooks.

### 6.6 Trust, privacy, accessibility
- **F15** Phone numbers stored encrypted (AES-256-GCM) + blind-index HMAC; never returned
  by public APIs; patient reference text encrypted.
- **F16** Consent records are auditable; retention job removes request contact details
  after fulfilment/expiry.
- **F17** Full bilingual UI; keyboard accessible; no dead buttons or decorative forms.

## 7. Non-goals (v1)

- Native mobile apps, app-store distribution.
- Medical advice, eligibility screening, blood testing, compatibility guarantees.
- Payments, donor gamification, public donor directory, bulk/marketing campaigns.
- Live integration with a national inventory system (interface is ready, credentials are not).

## 8. Success criteria

Time-to-first-search under a few seconds on a mid-range phone; every public claim traceable
to a database row; 100% of mutations covered by permission checks and audit events;
`pnpm verify` green; documented blockers for anything not production-ready.

See `docs/product/acceptance-criteria.md` for the verifiable checklist.