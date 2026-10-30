# Assumptions and decisions

Every significant choice made while building Rakta-Daan, with its rationale and what would
change it. Status: **decided** unless noted.

## Product scope

| # | Decision | Rationale | Revisit when |
| --- | --- | --- | --- |
| D1 | Website only, no native app | The brief is explicit; a shareable link + messaging beats an install in an emergency | Product strategy changes |
| D2 | Nepal-first data model, expandable enums/tables | Avoids over-engineering a global product while keeping room to grow | Launching in another country |
| D3 | English + Nepali dictionaries under `/[locale]`, `en` default | Both languages are required; server-rendered dictionaries keep it fast | Adding a third language |
| D4 | Geography as reference data (`provinces`, `districts`, `src/data/geography.ts`) | Never hard-code geography in components; source documented | Municipal-level data is added (needs a sourced dataset) |
| D5 | "Not sure of blood group" is a first-class path | Guessing compatibility is dangerous; we explain instead | Medical guidance changes |
| D6 | Demo flows exist (`/request/new`, `/donor/demo`, `/org/demo`, `/admin/demo`) and are **labelled demo**, stored in `localStorage`, `noindex` | Lets anyone exercise the UX without an account, without faking production data | Real flows cover the same journey for anonymous users |

## Data model and privacy

| # | Decision | Rationale |
| --- | --- | --- |
| D7 | Phone numbers are never stored in plaintext: AES-256-GCM ciphertext (`phone_enc`) + keyed HMAC blind index (`phone_hash`) for exact lookup | Nepal's Privacy Act 2075 treats contact details and health data as personal/sensitive; encryption at rest limits blast radius |
| D8 | Requester contact phone and free-text patient reference are encrypted; public request pages render them only when `share_contact_publicly` is set **and** the request is still open, and only if ciphertext exists | Minimises incidental disclosure |
| D9 | Donor contact details are never returned by public APIs; they are exchanged only through the response workflow after a donor opts in | Reviewed competitors vary widely here; consent-based contact is the safer default |
| D10 | Request contact details are wiped by the retention job after fulfilment/expiry (`src/lib/retention.ts`) | Data minimisation; contact is useless once the request ends |
| D11 | OTP login instead of passwords | Mobile-first population, no password-reuse risk; OTP is peppered (`OTP_PEPPER`) and rate-limited |
| D12 | Session = signed, `HttpOnly`, `SameSite=Lax`, `Secure`-when-HTTPS cookie | Simple, server-verifiable, resistant to JS exfiltration |

## Messaging

| # | Decision | Rationale |
| --- | --- | --- |
| D13 | Adapter pattern (`mock` / `sparrow` / `whatsapp`) behind one outbox | No credentials in this environment; the interface is real, the default adapter truthfully reports `simulated` |
| D14 | Message states are `queued → sent → delivered \| failed`, with a separate `simulated` flag/state | Never claim delivery the provider did not confirm |
| D15 | Outbox is idempotent (`dedupe_key`) and dispatched by a cron endpoint (`/api/internal/outbox`) or `pnpm outbox` | Prevents duplicate sends to donors in an emergency |
| D16 | Opt-out (`STOP`) is enforced at send time, not only at enqueue time | Consent can change between queue and dispatch |
| D17 | Nepal SMS goes through a local aggregator (Sparrow) rather than an international one | Local routes/registered sender IDs; Twilio's Nepal guide says alphanumeric sender IDs must be pre-registered — **assumption, to be confirmed in procurement** |

## Architecture and delivery

| # | Decision | Rationale |
| --- | --- | --- |
| D18 | Next.js App Router with server components for all public reads; client components only where interactivity requires it | Fast first paint on slow networks; SEO for shareable request links |
| D19 | Postgres in Docker on `127.0.0.1:5435` (not 5432) | 5432/5433 are occupied by other local projects |
| D20 | Drizzle SQL migrations committed under `drizzle/` | Reproducible schema; tests migrate a separate `rakta_daan_test` database |
| D21 | Rate limiting persisted in a table (`rate_limits`) | Survives restarts and works without Redis |
| D22 | Every mutation writes an `audit_events` row | Required for an investigation-capable admin console |

## Open assumptions (need confirmation before launch)

| # | Assumption | Impact if wrong | How to verify |
| --- | --- | --- | --- |
| A1 | A local Nepali SMS aggregator can deliver transactional OTP/alerts to NTC and Ncell with a registered sender ID | OTP and alerts fail silently | Live test with real SIMs, request delivery reports |
| A2 | WhatsApp Cloud API template approval for "blood request alert" utility messages will be granted | WhatsApp channel unusable | Submit the template in Meta WhatsApp Manager |
| A3 | Nepal's Privacy Act 2075 + ETA 2063 requirements are satisfied by our consent + minimisation model | Legal exposure | Nepal counsel review of `docs/security-privacy.md` |
| A4 | No NTA rule currently forbids our transactional SMS pattern (opt-in, STOP support, no marketing) | Compliance risk | Counsel check of current NTA notices |
| A5 | Municipality/ward-level boundary data can be sourced authoritatively later | District-only granularity | Publish a sourced dataset with attribution |
| A6 | Donors accept SMS/WhatsApp alerts for emergency requests at all (vs. call-only) | Lower match rates | Measure response rates after launch |

## Explicitly rejected ideas

* **Public donor phone directory** — rejected; contact is exchanged only after consent.
* **"Verified donor" badge** — rejected as a single label; verification states are separated
  (phone verified vs. org verified vs. self-reported blood group) so the UI cannot imply
  clinical screening.
* **Fake inventory/statistics for demo polish** — rejected; demo data must be labelled demo.
* **Native app / app-store assets** — out of scope by brief.
