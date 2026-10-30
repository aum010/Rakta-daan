# Security and privacy

> This document is the design and implementation record. It is **not** legal advice; the
> Nepal-law items in §8 are marked as assumptions pending counsel review.

## 1. Threat model (what we defend)

| Asset | Threat | Control |
| --- | --- | --- |
| Donor phone numbers | Public scraping / mass harvesting | Never returned by public APIs; encrypted at rest; contact exchanged only after donor response |
| Requester & patient contact details | Disclosure on a shared request link | AES-256-GCM encryption; rendered only when `share_contact_publicly` + request `open` + ciphertext present; wiped by retention after close |
| Accounts (donors, requesters, admins) | Account takeover | Phone-OTP login with peppered hashes, attempt limits, expiry, rate limits, session revocation on logout |
| Admin/organisation privileges | Privilege escalation | Session + role check on every mutation; cross-origin mutation blocked; admin API returns 403 for non-admins (smoke-tested) |
| Message channel | Spam / unsolicited bulk sends | No campaign features; consent checked at enqueue **and** send; opt-out table enforced; idempotent dedupe keys |
| Secrets | Leakage via repo/logs | `.env*` git-ignored; no secret ever printed; provider credentials only in env |
| Application | Injection, XSS, CSRF | Parameterised SQL (Drizzle), React escaping, `Origin` check on mutations, HttpOnly/SameSite cookies |

## 2. Cryptography (`src/lib/crypto.ts`, `src/lib/phone.ts`)

| Purpose | Algorithm | Notes |
| --- | --- | --- |
| Field encryption (`phone_enc`, `contact_phone_enc`, `patient_reference_enc`) | AES-256-GCM, random 12-byte IV, purpose-bound AAD (`field` / `request-contact` / …) | Ciphertext format `v1.<iv>.<tag>.<data>`; decrypt failures surface as errors, never as silent plaintext |
| Blind index (`phone_hash`) | HMAC-SHA256 with `AUTH_SECRET`-derived key, purpose-bound | Enables exact-match lookup without storing plaintext |
| OTP codes | Random 6 digits, stored as peppered hash (`OTP_PEPPER`) | Never logged; returned in API only when `DEV_EXPOSE_OTP=true` |
| Session cookie | HMAC-signed value, `HttpOnly`, `SameSite=Lax`, `Secure` on HTTPS | Rotated at login, revocable (`sessions` table) |
| IP in audit events | Salted hash (`hashIp`) | Correlatable without storing raw IP |
| Response tokens | 32 random bytes, single-use capability links | No session needed for the donor; token scoped to one response |

Key management: keys come only from environment variables; rotating `AUTH_SECRET` invalidates
sessions and blind indexes (documented in `docs/deployment.md`).

## 3. Authorisation model

| Actor | Can | Cannot |
| --- | --- | --- |
| Anonymous | Read public pages, search aggregates, view public request page, respond via token | See donor identities/numbers; mutate anything |
| Donor (session) | Own profile, availability, consents, own responses | Read other donors' contact data; create requests on others' behalf |
| Requester (session) | Own requests, own dashboard, contact of donors who responded to *their* request | Edit/close others' requests; escalate to admin |
| Org member (`owner/editor/viewer`) | Inventory for **their** org, org profile | Other orgs' data (403, smoke-tested) |
| Admin | Verify orgs, manage camps, triage abuse reports | Bulk-export personal data; every action is audited |

Rules are enforced server-side in route handlers; the UI only mirrors them.

## 4. Consent

* Donor consent is recorded per kind and channel with timestamp and source
  (`donor_consents`, `src/lib/consent.ts`).
* Request creation captures accuracy, sharing and update consents (Zod `literal`/refine
  enforced server-side).
* Consent is re-checked **at send time**, not only at enqueue time.
* Opt-out (`STOP`) is a phone-level suppression list applied on every send.
* Consent and every state change are written to `audit_events`.

## 5. Rate limiting and abuse

* Fixed-window counters persisted in `rate_limits` (`src/lib/rate-limit.ts`) — survives
  restarts, no Redis needed.
* Applied to OTP request/verify (per phone and per IP), login, request creation, response
  submission, and reporting endpoints.
* Abuse reporting endpoint (`/api/v1/abuse-reports`) + admin triage queue.
* Demo/real duplicate request suppression at creation.

## 6. Data retention (`src/lib/retention.ts`, run by cron)

| Data | Retention |
| --- | --- |
| Request contact phone + patient reference | Scrubbed 7 days after a request closes |
| Message delivery records | Deleted after 12 months |
| Audit events | Deleted after 24 months |
| Expired sessions, OTP codes, stale rate-limit windows | Purged every run |

The privacy notice shown at `/[locale]/privacy` states these commitments.

## 7. Verified security checks

Run locally in this repository (see `docs/final-report.md` for exact commands/results):

* `pnpm test` — includes integration tests asserting: ciphertext never contains the
  plaintext phone, cross-origin mutation rejected (403), non-admin admin-API rejected (403),
  consent re-checked at send, opt-out honoured, outbox idempotency.
* `pnpm smoke` — HTTP-level: OTP login, request creation, donor token response,
  requester-only contact visibility, org inventory permission (403 for outsiders),
  admin verification (403 for non-admin), webhook bearer (401), cron secret (401),
  rate limiting (429), logout revocation.
* `pnpm lint` / `pnpm typecheck` — includes React hooks rules (purity, no setState in effect).

## 8. Nepal compliance — assumptions requiring counsel

| Topic | What we assume | Source status |
| --- | --- | --- |
| Privacy Act 2075 | Encryption + minimisation + consent + retention satisfies obligations for personal/sensitive data | **Authoritative summary only** (ADB); statutory PDF not fetchable — confirm against enacted text |
| Electronic Transactions Act 2063 | Electronic records/consent handling acceptable | Official existence verified (ILO/Law Commission); section-level review pending |
| "National Data Privacy Policy 2021" | Could **not** be verified as an authoritative instrument | Not verified — do not cite it |
| NTA rules on commercial SMS/CLI/unsolicited messages | No specific rule verified | Not verified; we follow prudent controls: opt-in, STOP/HELP, sender ID clarity, no marketing |

Prudent controls implemented regardless of the above: granular opt-in, urgent-vs-promotional
separation, clear sender identity, simple opt-out, rate limits, send logging, no repurposing
of emergency consent for marketing.

## 9. Known security limitations (launch blockers)

1. **Secrets are development values in `.env.local`.** Production must use a managed secret
   store; `AUTH_SECRET`/`OTP_PEPPER` must be freshly generated (≥32 bytes).
2. **No TLS termination in this repo** — deployment must serve HTTPS only; cookies switch to
   `Secure` automatically when the origin is HTTPS, but HSTS must be set at the proxy.
3. **Provider webhook signatures** are implemented (WhatsApp `X-Hub-Signature-256`, SMS
   bearer secret) but only exercised against synthetic requests — needs a live provider test.
4. **Counsel review** of §8 has not happened.
5. **No automated DAST/penetration test** has been run; the checks listed in §7 are the
   evidence available today.
