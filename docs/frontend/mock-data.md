# Mock data and demonstration layer

Two distinct layers keep synthetic content out of real data and out of production claims.

```
src/mocks/            browser-local demo stores (localStorage)  → demo journeys
src/mocks/fixtures.ts synthetic read-only fixtures               → dashboard previews
src/data/geography.ts real reference data (NOT mock)             → province/district lists
```

Nothing in `src/mocks` ever touches the database; nothing reads from it during real
(authenticated) flows.

## 1. Browser-local stores (`src/mocks/`)

| File | Key(s) | Contents |
| --- | --- | --- |
| `request.ts` | `rakta-daan:demo-requests:v1` | Up to 10 demo requests: group, component, units, urgency, hospital, location, contact preference, consents, timeline events, status |
| `donor.ts` | `rakta-daan:demo-donor:v1`, `…-responses:v1` | One demo donor profile + their responses to demo requests |
| `id.ts` | — | `DEMO-XXXXXXXX` reference creation/normalisation/validation |
| `storage.ts` | — | Defensive `localStorage` read/write (private mode, quota and disabled storage never break the page) |
| `use-demo-data.ts` | — | `useDemoDataVersion()` / `notifyDemoDataChanged()` — subscription hook so components re-render after a store write |
| `fixtures.ts` | — | Read-only synthetic datasets (below) |

Validation lives beside the data: `demoRequestInputSchema` and `demoDonorInputSchema` are
Zod schemas reused by both the UI and `tests/unit/demo-validation.test.ts`.

## 2. Synthetic fixtures (`src/mocks/fixtures.ts`)

| Export | Used by |
| --- | --- |
| `DEMO_FACILITIES` (with `DemoInventoryRow` freshness states) | Org dashboard preview |
| `DEMO_ADMIN_REQUESTS` | Admin preview request table |
| `DEMO_VERIFICATION_CASES` | Admin verification queue |
| `DEMO_NOTIFICATIONS` | Notification logs (synthetic provider states) |
| `DEMO_ABUSE_REPORTS` | Abuse triage preview |
| `DEMO_AUDIT_EVENTS` | System activity preview |
| `DEMO_CAMPS` | Camp listings |
| `DEMO_ORG_REQUESTS` | Org request coordination + donor dashboard previews |

**Labelling rules (enforced in UI, tested in e2e):**

1. Every demo surface renders `DemoBanner`.
2. Demo routes emit `robots: noindex` and are excluded from `/sitemap.xml`.
3. Notification previews say "Demo notification — no real message has been sent."
4. Inventory in previews uses explicit states: *Available (demo dataset)*, *Recently
   updated*, *Needs confirmation*, *Unknown*, *Stale* — never presented as live stock.
5. No fixture contains a real person's data; phone numbers use reserved demo ranges
   (`+97798xxxxxxxx` fixtures, `+977980000000x` for scripted smoke tests).

## 3. What is *not* mock

| Data | Source |
| --- | --- |
| Province/district reference lists | `src/data/geography.ts` + `provinces`/`districts` tables (documented source) |
| Blood-bank directory, inventory, donors, requests, camps on public pages | Existing backend/database |
| Availability summary (donor count, compatible groups) | Backend aggregation with k-anonymity (counts below 3 render "3+") |

The homepage, `/find`, `/banks`, `/camps` and `/requests/[publicId]` read **real** rows — the
"demo data" label is never applied to them, and the "verified"/"stale" labels they show are
computed from database columns (`verification`, `updated_at`).

## 4. Demonstration → backend mapping

| Demo behaviour today | Future backend equivalent |
| --- | --- |
| `saveDemoRequest()` → localStorage | `POST /api/v1/requests` (already exists) |
| Status timeline events in the store | `blood_requests` + `request_responses` rows |
| `saveDemoDonor()` → localStorage | `POST /api/v1/donors` (already exists) |
| `notifyDemoDataChanged()` | Server revalidation / refetch |
| Fixtures for dashboards | Real dashboard queries (already exist for `/org`, `/admin`) |

The demo layer is therefore a **UI prototype of flows that already have real endpoints** —
it exists so the experience can be exercised without an account, and it must never be
presented as production data.

## 5. Adding mock data

1. Add or extend an export in `src/mocks/fixtures.ts` (read-only) or a store in
   `src/mocks/*.ts` (localStorage-backed).
2. Give every dataset a `label`/`DemoBanner` surface and `noindex` route.
3. Add a Zod schema next to it and cover it in `tests/unit/demo-validation.test.ts`.
4. Never copy real personal data into fixtures.
