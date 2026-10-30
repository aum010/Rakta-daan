# Platform audit (baseline → current)

## 1. Baseline assessment (before this build)

The repository was inspected first, per the brief. Findings at baseline:

| Area | Baseline state |
| --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript + Tailwind 4 scaffold present |
| Database | No schema, no migrations, no Docker Compose file |
| API | None |
| Auth | None |
| Pages | Scaffold only — no product pages |
| Tests | None (no test runner configured) |
| Docs | No README, no docs/ |
| Config | No `.env.example`, no lint config, no Drizzle config |

Because no functioning application existed, a clean structure was established on the stack
already present (Next.js + TypeScript + Tailwind) rather than replacing the scaffold.

## 2. What exists now

### Pages (45 routes under `src/app/[locale]`)
*Public:* home, `/find` (+ `/find/guidance`), `/banks`, `/banks/[slug]`, `/camps`,
`/camps/[id]`, `/requests/[publicId]`, `/respond/[token]`, `/learn` (+ compatibility,
donation guide, FAQ), `/for-donors`, `/for-organisations`, `/about`, `/safety`, `/privacy`,
`/terms`, `/accessibility`, `/contact`, `/abuse`, `/help`.
*Auth:* `/login` (phone OTP).
*Account:* `/dashboard` (requests), `/dashboard/requests/new`,
`/dashboard/requests/[publicId]`, `/donor` (donor console).
*Org/Admin:* `/org` (inventory), `/admin` (verification, camps, abuse triage).
*Labelled demo flows (browser-local, noindex):* `/request/new`, `/request/status`,
`/request/status/[reference]`, `/request/edit/[reference]`, `/donor/demo`,
`/donor/demo/register`, `/donor/demo/dashboard`, `/org/demo`, `/admin/demo`.

### API (20 route handlers)
`/api/health`, `/api/internal/outbox`,
`/api/v1/auth/{otp/request,otp/verify,logout}`,
`/api/v1/{requests,requests/[publicId]/close,requests/[publicId]/respond,requests/[publicId]/notify-more}`,
`/api/v1/{responses/[token],availability,donors,donors/me}`,
`/api/v1/orgs/[slug]/inventory`,
`/api/v1/{admin/orgs/[id]/verification,admin/camps,admin/abuse/[id]}`,
`/api/v1/{abuse-reports}`, `/api/webhooks/{sms,whatsapp}`.

### Domain modules (`src/lib`)
Matching, request lifecycle, consent, geo (haversine + Nepal reference data), blood
compatibility rules, phone normalisation (977), field crypto + blind index, rate limiting,
audit, retention, i18n, validation, HTTP/error envelope, messaging (templates, adapters,
outbox), demo store.

### Data
* `src/db/schema.ts` — 17 tables + 20 enums, real PG enums.
* `drizzle/0000_small_mesmero.sql`, `drizzle/0001_graceful_talkback.sql` (nullable
  `contact_phone_enc` for retention scrubbing).
* `src/data/geography.ts` — provinces/districts reference data (documented source in file).
* `scripts/seed.ts` — production-safe seed + `--demo` fixtures **labelled demo**.

### Verification assets
* `tests/unit/*` (11 files), `tests/integration/*` (3 files, real Postgres), `tests/e2e/*`
  (Playwright specs), `scripts/smoke.ts` (HTTP end-to-end), `pnpm verify` pipeline.

## 3. Gaps and known issues (honest)

| Gap | Why | Blocks launch? | How to complete |
| --- | --- | --- | --- |
| No real SMS/WhatsApp credentials in this environment | Requires paid accounts + Meta template approval | **Yes** for notification delivery (OTP in dev uses `DEV_EXPOSE_OTP`) | Obtain credentials, submit utility template, run live test (see `docs/messaging-integration.md` §7) |
| Nepal legal review not done | Needs counsel | **Yes** | Counsel review of `docs/security-privacy.md` §8 |
| Municipality/ward boundary data not sourced | Authoritative dataset required | No (district-level works) | Source + attribute dataset |
| e2e suite runs locally via `pnpm test:e2e` but is not part of `pnpm verify` | Keep the fast gate fast; CI should run both | No | Add a CI job running `pnpm verify` + `pnpm test:e2e` + `pnpm smoke` |
| No CI configuration | Not requested/available in this environment | No | Add CI running `pnpm verify` + smoke |
| No production hosting config | Deployment target undecided | **Yes** for going live | Follow `docs/deployment.md` |
| Playwright browsers not installed here | Environment limitation | No for unit/integration coverage | `pnpm exec playwright install` then run e2e |

## 4. Baseline vs. now (quality gates)

| Gate | Baseline | Now |
| --- | --- | --- |
| `pnpm typecheck` | n/a | Passes |
| `pnpm lint` | n/a | Passes (incl. React hooks purity rules) |
| `pnpm test` | none | 105 tests passing against real Postgres |
| `pnpm build` | n/a | Succeeds |
| `pnpm smoke` | none | HTTP end-to-end suite (see final report) |
