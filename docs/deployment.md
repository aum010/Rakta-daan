# Deployment and operations

> No deployment has been executed from this environment. These instructions are the
> runbook; every step marked **VERIFY** must be run in the target environment.

## 1. Architecture target

Any host that can run a long-lived Node.js process with a managed PostgreSQL:

* Node.js 20+ (built with `pnpm build`, run with `pnpm start` — port 3000, override with
  `PORT`/`-p`), **or** a container wrapping those two commands.
* PostgreSQL 16 (managed service recommended: daily PITR, encryption at rest).
* A reverse proxy / platform edge terminating TLS (HTTPS only).

Static assets are served by Next itself; there is no separate CDN requirement.

## 2. Environment

Copy `.env.example` → deployment secret store. Production requirements:

| Variable | Production guidance |
| --- | --- |
| `DATABASE_URL` | Managed Postgres, `sslmode=require` |
| `AUTH_SECRET` | Fresh ≥32-byte random value; rotating it invalidates sessions **and** blind indexes (phones become unsearchable — see §6) |
| `OTP_PEPPER` | Fresh ≥32-byte random value |
| `CRON_SECRET`, `WEBHOOK_SECRET` | Fresh random values, distinct per environment |
| `APP_URL` | Canonical HTTPS origin, e.g. `https://rakta-daannp.example` |
| `MESSAGING_PROVIDER` | `sparrow` or `whatsapp` once credentials exist; keep `mock` until then |
| `SPARROW_*` / `WHATSAPP_*` | From the provider consoles |
| `DEV_EXPOSE_OTP` | **Must be absent/false in production.** If true, OTPs are returned in API responses |

## 3. First deploy

```bash
pnpm install --frozen-lockfile
pnpm build                 # VERIFY: exits 0
pnpm db:migrate            # VERIFY: "[migrate] applied migrations to …"
pnpm db:seed               # reference data only (safe); use db:seed:demo ONLY on staging
pnpm start                 # VERIFY: GET /api/health → {"status":"ok"}
```

## 4. Cron

The outbox, request expiry and retention jobs run via HTTP:

```
*/1 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/internal/outbox
```

Equivalent offline worker: `pnpm outbox`. **VERIFY:** run it manually once and confirm it
prints `dispatch`, `expiredRequests`, `retention` counts.

## 5. Backups and recovery

| Item | Schedule | Restore drill |
| --- | --- | --- |
| Postgres full + WAL/PITR | Daily full, continuous WAL (managed provider) | Restore into a scratch instance, run `SELECT count(*)` on core tables, run `pnpm test` against it |
| Secrets | Stored in the platform secret manager with 2-person access | Rotation runbook below |
| `drizzle/` migrations | In git — schema is reproducible from scratch | `pnpm db:reset` on an empty DB |

**VERIFY** at least once before launch: point a staging environment at a restored snapshot
and run `pnpm verify` + `pnpm smoke`.

## 6. Secret rotation impacts

| Secret | Effect of rotation |
| --- | --- |
| `AUTH_SECRET` | All sessions invalid (users re-login); blind indexes (`phone_hash`) recomputed — requires re-encrypting/re-indexing existing phones, so rotate only with a migration plan |
| `OTP_PEPPER` | Outstanding OTP codes invalid |
| `CRON_SECRET`/`WEBHOOK_SECRET` | Update the cron job and aggregator webhook config together |

## 7. Monitoring

* **Health probe:** `GET /api/health` (DB connectivity included).
* **Alerts to add:** health failures for 2 min; `messages` rows stuck in `queued` > 15 min;
  `failed` messages rate; 5xx rate; cron not run in 5 min.
* **Logs:** application logs must not contain phone numbers, OTP codes or message bodies —
  the codebase avoids this, keep it that way in any new code.

## 8. Scaling notes

Reads dominate; a single primary is enough initially. The outbox dispatcher is a single
worker keyed by `dedupe_key`, so running cron on multiple nodes is safe (state transitions
are conditional). Add a read replica before adding caching.

## 9. Rollback

1. Deploy previous build artefact.
2. Migrations are forward-only by policy; destructive changes must ship in two releases
   (add/read-migrate/drop) so a code rollback is always safe.
3. Re-run `GET /api/health` and a smoke pass after any rollback.
