# Acceptance criteria and launch checklist

Status legend: **PASS** (verified in this repository, command listed), **PARTIAL**,
**BLOCKED** (external dependency), **N/A**.

## 1. Functional

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| F1 | Search by group/district/radius returns banks + donor count, no identities | PASS | `pnpm test` (integration `availability`), smoke "availability summary hides identities" |
| F2 | "Not sure of group" path explains instead of guessing | PASS | unit `blood`, page `/find/guidance`, e2e spec |
| F3 | Blood banks directory + detail with freshness | PASS | smoke "public bank page shows reported units" |
| F4 | Camp directory | PASS | pages + admin camp API (smoke) |
| F5 | Public shareable request page without login | PASS | smoke "public request page loads" |
| F6 | Requester creates request only when authenticated | PASS | integration `requests`, smoke OTP login |
| F7 | Duplicate suppression, lifecycle, close, expiry | PASS | integration `requests` + retention tests |
| F8 | Matching respects availability/cooldown/radius/consent | PASS | unit `matching` (12 tests), integration |
| F9 | Donor responds via token link; contact revealed only then | PASS | smoke "donor responds via token link", "requester sees consenting donor contact" |
| F10 | Donor console controls availability/channels/consent | PASS | unit `demo-*` + integration consent re-check |
| F11 | Org inventory authorised + audited + fresh | PASS | smoke "staff can update inventory" + "inventory update requires org membership" (403) |
| F12 | Admin verification/camps/abuse with role checks | PASS | smoke "admin verifies organisation", "admin API rejects non-admin" (403) |
| F13 | Truthful message states, idempotent outbox | PASS | integration `outbox` (6 tests incl. "does not send twice", "marks mock sends as simulated, not delivered") |
| F14 | STOP opt-out enforced | PASS | outbox test "honours phone-level opt-outs" |
| F15 | Bilingual UI, no dead buttons | PARTIAL | All links/routes exist; demo flows are labelled; full human review of Nepali copy recommended |

## 2. Security & privacy

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| S1 | OTP auth tested | PASS | smoke OTP request/verify/logout |
| S2 | Authorisation tested (admin, org, owner) | PASS | smoke 403s, integration ownership tests |
| S3 | Ciphertext never equals plaintext phone | PASS | integration `requests` asserts `phone_enc` starts with `v1.` and excludes plaintext |
| S4 | Secrets not committed | PASS | `.env*` git-ignored; `.env.example` has placeholders |
| S5 | Rate limiting configured | PASS | smoke "OTP rate limiting engages per phone" (429) |
| S6 | Cross-origin mutation blocked | PASS | smoke 403 with foreign Origin |
| S7 | Webhook/cron endpoints authenticated | PASS | smoke 401s |
| S8 | Consent auditable; retention scrubs contact | PASS | `donor_consents`, `audit_events`, `src/lib/retention.ts` (7-day scrub) |
| S9 | Critical security defects resolved | PASS for known issues | No open high-severity findings in code review; limitations in `docs/security-privacy.md` §9 |
| S10 | Nepal legal review | **BLOCKED** | Requires counsel (assumption A3/A4) |

## 3. Operations

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| O1 | Migrations work from clean DB | PASS | `pnpm db:migrate` on `rakta_daan`; tests migrate `rakta_daan_test` automatically |
| O2 | Tests run | PASS | `pnpm test` → 105 passed (14 files) |
| O3 | Typecheck + lint clean | PASS | `pnpm typecheck`, `pnpm lint` |
| O4 | Production build succeeds | PASS | `pnpm build` |
| O5 | End-to-end HTTP smoke passes | PASS | `pnpm smoke` (see final report for exact tally) |
| O6 | CI checks configured | **BLOCKED** | No CI system available in this environment — `pnpm verify` is the entry point |
| O7 | Monitoring configured | **BLOCKED** | No hosting/monitoring provider chosen; `/api/health` is ready for probes |
| O8 | Backups and recovery documented | PASS (documented) | `docs/deployment.md` §5 — execution depends on the chosen host |
| O9 | Deployment instructions verified | PARTIAL | Documented for a Node host; **not** executed to a real environment |
| O10 | Known limitations documented | PASS | `docs/final-report.md`, `docs/research/platform-audit.md` §3 |

## 4. Messaging

| # | Criterion | Status |
| --- | --- | --- |
| M1 | Provider adapters implemented | PASS (`mock`, `sparrow`, `whatsapp`) |
| M2 | Mock mode works | PASS (integration + smoke `simulated ≥ 1`) |
| M3 | Real provider integration documented | PASS (`docs/messaging-integration.md`) |
| M4 | Delivery states truthful | PASS (asserted in tests) |
| M5 | Duplicate sends prevented | PASS (`dedupe_key` idempotency test) |
| M6 | Opt-outs enforced | PASS |
| M7 | Failed jobs inspectable | PASS (`messages.last_error`, attempts) |
| M8 | No unsolicited bulk messaging | PASS (no campaign code paths exist) |
| M9 | Live provider delivery | **BLOCKED** — credentials + template approval required |

## 5. Launch blockers summary

1. Production SMS/WhatsApp credentials + live delivery test (A1/A2).
2. Nepal privacy/telecommunications legal review (A3/A4).
3. Production host, HTTPS, managed secrets, backups, health monitoring.
4. Human bilingual copy review of Nepali strings.
5. Optional: wire `tests/e2e` into CI with Playwright browsers installed.
