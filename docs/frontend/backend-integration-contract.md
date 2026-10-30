# Backend integration contract

How the frontend talks to services today, and exactly what a future backend must expose for
the mock/demonstration layer to be replaced without redesigning pages.

## 1. Principles

1. **One entry point.** Every authenticated/real API call goes through
   `src/services/api.ts` (`apiRequest<T>`), which handles JSON, credentials, same-origin
   headers and a uniform error envelope. Pages/components never construct URLs inline.
2. **Typed.** Request bodies are Zod-validated (`src/lib/validation.ts`); responses are
   typed in the calling module.
3. **Uniform errors.** `{ error: { code, message, details? } }` with 400/401/403/404/409/429.
   `describeError()` maps them to localized, non-technical copy.
4. **Demo swap point.** Demonstration screens call `@/mocks/*` instead. Replacing a demo
   surface with a real one means swapping the call site to `@/services/api` — no layout or
   component redesign.

## 2. Existing endpoints consumed by the UI

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/otp/request` | — | Request an OTP (rate-limited) |
| POST | `/api/v1/auth/otp/verify` | — | Verify OTP → session cookie |
| POST | `/api/v1/auth/logout` | session | Revoke session |
| GET | `/api/v1/availability?group&district&radius` | — | Donor count (k-anonymity) + banks + compatible groups |
| GET | `/api/v1/requests`, POST | session | List/create requests |
| POST | `/api/v1/requests/[publicId]/close` | owner | Close request |
| POST | `/api/v1/requests/[publicId]/notify-more` | owner | Re-notify within rules |
| POST | `/api/v1/requests/[publicId]/respond` | donor/session | Response bookkeeping |
| POST/GET | `/api/v1/responses/[token]` | capability token | Donor response via share link |
| POST | `/api/v1/donors`, `/api/v1/donors/me` | session | Register/update donor |
| GET/PUT | `/api/v1/orgs/[slug]/inventory` | org member | Read/update inventory |
| POST | `/api/v1/admin/orgs/[id]/verification` | admin | Verify/reject organisation |
| POST | `/api/v1/admin/camps` | admin | Create/update camp |
| POST | `/api/v1/admin/abuse/[id]` | admin | Triage abuse report |
| POST | `/api/v1/abuse-reports` | — | Public abuse report |
| POST | `/api/webhooks/sms`, `/api/webhooks/whatsapp` | provider secret | Inbound opt-out / delivery receipts |
| POST | `/api/internal/outbox` | cron secret | Dispatch, expiry, retention |
| GET | `/api/health` | — | Liveness + DB check |

## 3. Key data shapes (as implemented)

```ts
// availability summary (public)
{ donorCount: number | "few", exactDonorCount: number, radiusKm: number,
  compatibleGroups: BloodGroup[],
  banks: { slug, name, nameNe, verification, districtCode, distanceKm,
           units, updatedAt, stale, source }[] }

// create request (session)
body: { bloodGroupNeeded, component, unitsNeeded, urgency, provinceCode, districtCode,
        hospitalName?, neededBy, contactName, contactPhone, notifyRadiusKm?, ...consents }
201 → { publicId, status, notified: { notified: number, simulated: number } }

// donor response (capability token)
body: { action: "interested" | "unavailable", note? }

// error
{ error: { code: string, message: string, details?: Record<string,string> } }
```

Full schema: `src/db/schema.ts` (tables) and `src/lib/validation.ts` (inputs).

## 4. What a future backend must add for the current demos

| Demo screen | Required endpoint(s) | Notes |
| --- | --- | --- |
| `/request/new` (wizard) | `POST /api/v1/requests` | Exists — needs no account? decide: anonymous requests or keep OTP gate |
| `/request/status/[ref]` | `GET /api/v1/requests/[publicId]` (owner-scoped) | Must never leak contact details to a bearer of the link |
| `/donor/demo/register` | `POST /api/v1/donors` | Exists |
| `/donor/demo/dashboard` | `GET/PATCH /api/v1/donors/me` | Availability + channels + consents |
| `/org/demo`, `/admin/demo` | Real dashboard queries | Must be server-filtered by role; **frontend role switching is not security** |

## 5. Messaging integration boundary

The browser must never talk to a provider.

* Server-side adapters (`src/lib/messaging/adapters.ts`): `mock` (default) / `sparrow` /
  `whatsapp`, with truthful states `queued → sent → delivered | failed` and a separate
  `simulated` outcome.
* Required from a real provider: credentials in env/server secrets, template approval
  (WhatsApp), sender-ID registration (Nepal SMS), delivery receipts via webhook, retry and
  opt-out enforcement — all server responsibilities listed in
  [../messaging-integration.md](../messaging-integration.md).
* Frontend contract for status display: `channel`, `state`, `sentAt?`, `lastError?` — never
  "delivered" unless the provider confirmed it.

## 6. Environment boundary

* No `NEXT_PUBLIC_*` secrets; no provider keys reach the client; no client-side flag can
  enable real messaging.
* `.env.example` is the source of truth for variable names — do not invent variables.

## 7. Migration checklist (demo → real)

1. Replace the `@/mocks/*` call with a typed `@/services/api` helper.
2. Keep the same component props (mock types already mirror API types).
3. Add loading/error/empty states if not present (`LoadingBlock`, `EmptyState`, `Callout`).
4. Cover with an integration test (`pnpm test`) and the matching Playwright journey.
5. Remove or keep the demo route — if kept, it must stay `noindex` and banner-labelled.
