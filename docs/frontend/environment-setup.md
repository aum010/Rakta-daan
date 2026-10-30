# Environment setup

Every command below was executed successfully in this repository on 27 October 2026.

## 1. Prerequisites

| Tool | Version used | Why |
| --- | --- | --- |
| Node.js | 24.x | Next.js 16 runtime |
| pnpm | 10.x (`packageManager` in `package.json`) | Lockfile `pnpm-lock.yaml` |
| Docker | Desktop with engine running | PostgreSQL 16 for the data-backed pages (`docker-compose.yml`) |

## 2. Install and configure

```bash
pnpm install
cp .env.example .env.local
```

`.env.example` lists every variable the project actually uses — see
[environment reference](#4-environment-variables). Never add a variable to code without
adding it there.

## 3. Commands

| Command | What it does | Verified |
| --- | --- | --- |
| `pnpm dev` | Next dev server on **port 3000** (`next dev -p 3000`) | ✅ |
| `pnpm build` | Production build (45 pages + 20 API routes) | ✅ |
| `pnpm start` | Serve the production build on port 3000 | ✅ |
| `pnpm typecheck` | `tsc --noEmit` | ✅ |
| `pnpm lint` | `eslint .` (includes React hooks rules) | ✅ |
| `pnpm db:up` / `pnpm db:down` | Start/stop PostgreSQL (`127.0.0.1:5435`) | ✅ |
| `pnpm db:migrate` | Apply `drizzle/*.sql` | ✅ |
| `pnpm db:generate` | Generate a migration from `src/db/schema.ts` | ✅ |
| `pnpm db:seed` / `pnpm db:seed:demo` | Reference data / clearly-labelled demo fixtures | ✅ |
| `pnpm test` | Vitest: unit + integration (auto-creates `rakta_daan_test`) | ✅ 105 passed |
| `pnpm test:e2e` | Playwright journeys (starts its own dev server on **port 3100**; add `E2E_BASE_URL=…` to reuse a running server instead) | ✅ 31 passed (incl. 15 axe accessibility audits) |
| `pnpm smoke` | HTTP end-to-end checks against a running server (`SMOKE_BASE_URL`); that server must run with `DEV_EXPOSE_OTP=true` | ✅ 24/24 |
| `pnpm outbox` | Manual cron run (dispatch, expiry, retention) | ✅ |
| `pnpm verify` | `typecheck && lint && test && build` | ✅ |

### Ports

* `3000` — the app (`pnpm dev`).
* `3100` — Playwright's own dev server (started automatically; Next 16 allows only one dev
  server per project directory, so stop any manual server before running `pnpm test:e2e`, or
  point the suite at an existing one with `E2E_BASE_URL=http://localhost:3010 pnpm test:e2e`).
* `5435` — PostgreSQL (`127.0.0.1` only).
* `3000` may already be occupied by another local project on some machines — pass
  `pnpm exec next dev -p 3010` and `SMOKE_BASE_URL=http://localhost:3010 pnpm smoke`.

### Typical local loop

```bash
pnpm db:up && pnpm db:migrate && pnpm db:seed:demo
pnpm verify                                  # fast gate (typecheck + lint + tests + build)

# One manual dev server is enough for everything else:
DEV_EXPOSE_OTP=true pnpm exec next dev -p 3010   # http://localhost:3010
SMOKE_BASE_URL=http://localhost:3010 pnpm smoke   # 24/24
E2E_BASE_URL=http://localhost:3010 pnpm test:e2e  # reuses it instead of starting 3100

# Or let Playwright own the server (no manual dev server running):
pnpm test:e2e
```

## 4. Environment variables

Defined in `.env.example` (source of truth):

| Variable | Used for |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection (pages and API) |
| `AUTH_SECRET` | Session-cookie signing |
| `OTP_PEPPER` | OTP hashing pepper |
| `CRON_SECRET` | Bearer auth for `/api/internal/outbox` |
| `WEBHOOK_SECRET` | Bearer auth for inbound SMS webhook |
| `APP_URL` | Canonical origin for share links |
| `DEV_EXPOSE_OTP` | Development only: returns the OTP in the API response |
| `MESSAGING_PROVIDER`, `MESSAGING_FROM_NAME` | `mock` (default) / `sparrow` / `whatsapp` |
| `SPARROW_TOKEN`, `SPARROW_SENDER_ID`, `SPARROW_API_URL` | SMS aggregator (not configured here) |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_GRAPH_VERSION`, `WHATSAPP_TEMPLATE_REQUEST`, `WHATSAPP_TEMPLATE_LANG` | WhatsApp Cloud API (not configured here) |
| `TEST_DATABASE_URL` | Optional override for the test database |

**Frontend-only note:** the browser never receives a secret. There are no `NEXT_PUBLIC_*`
provider keys, and no environment flag can turn on real messaging from the client — sending
happens only on the server, and by default `MESSAGING_PROVIDER=mock` reports *simulated*.

## 5. Adding pages, components and data (quick reference)

```text
New page           → src/app/[locale]/<segment>/page.tsx  (+ strings in src/messages/en.ts and ne.ts)
New UI primitive   → src/components/ui/<name>.tsx          (export from ui.tsx when it is shared)
New feature form   → src/components/<feature>/<name>.tsx
API call           → add a typed helper in src/services/api.ts (do not fetch inside components)
Browser-local demo → src/mocks/  (+ DemoBanner + robots noindex)
Synthetic fixtures → src/mocks/fixtures.ts  (clearly labelled demo data)
```

See [documentation index](../../README.md#documentation) for the full doc set.
