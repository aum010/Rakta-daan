# Frontend user journeys

Six journeys, as specified by the frontend test plan (§23 of the prompt). For each: the
screen flow, what is **real** vs **demonstration**, and the test that proves it.

Layer key: **API** = existing backend page/route · **Mock** = browser-local demo flow.

---

## Journey A — Search for blood (primary)

| Step | Screen | Layer |
| --- | --- | --- |
| 1 | Homepage: hero "Need Blood? Find the Right Help, Faster." + quick search panel | API read |
| 2 | "Find Blood Now" → `/find` | API |
| 3 | Choose blood group (9 choices, none preselected) | client |
| 4 | Choose district (+ optional radius, optional hospital) | client |
| 5 | Submit → `/find?group=…&district=…&radius=…` | API |
| 6 | Results: blood banks with distance/verification/freshness, donor **count** ("3+"), compatible-group explainer | API |
| 7 | Change group/location/radius, sort by distance/freshness/name, open a facility `/banks/[slug]` | API |
| 8 | No results → helpful empty state (wider radius, other district, banks, submit request, facility guidance) | API |

*Choosing "Not sure" redirects to `/find/guidance` instead of guessing.*
Tests: `tests/e2e/home-find.spec.ts`, `tests/integration/availability.test.ts`.

## Journey B — Submit a request

**Real path (authenticated):** `/dashboard/requests/new` → OTP login if needed → step form →
`POST /api/v1/requests` → confirmation with `publicId` → `/dashboard/requests/[publicId]`
(share, notify-more, close).

**Demonstration path (no account):** `/request/new` → 4-step wizard with inline validation →
confirmation screen with reference and share link → `/request/status/[ref]` timeline → edit
or cancel.

Validation errors appear next to the field, entered values are preserved, and the demo path
is banner-labelled and stored only in `localStorage`.
Tests: `tests/e2e/request-demo.spec.ts`, `tests/integration/requests.test.ts`, smoke
"create request".

## Journey C — Register as a donor

**Real path:** `/register` → OTP → `DonorRegistrationForm` (group, sex, location,
availability, channels, explicit consents) → `/donor` console.

**Demonstration path:** `/donor/demo` → `/donor/demo/register` (3 steps, consent gate with
unchecked-by-default boxes, blocking validation if skipped) → `/donor/demo/dashboard` →
change availability → update channel preferences → respond to a demo request → delete
profile (confirmation → empty state).

Tests: `tests/e2e/donor-demo.spec.ts`, `tests/unit/demo-validation.test.ts`.

## Journey D — Explore blood-bank information

`/banks` → search by name/district + blood-group filter → open `/banks/[slug]` → contact,
verification state, inventory with units **and** last-updated/staleness label → demo-data
labels visible wherever the data is synthetic.

Tests: `tests/e2e/system-pages.spec.ts`, smoke "public bank page shows reported units".

## Journey E — Mobile navigation

Viewport 390×844 → menu button (labelled "Menu") → drawer opens → "Learn" link navigates →
Escape closes. Then: run Journey A, open a result, submit a demo request — the primary
actions remain reachable without horizontal scrolling or hover-only affordances.

Tests: `tests/e2e/home-find.spec.ts` ("mobile menu opens, closes with Escape…").

## Journey F — Consent controls

`/donor` (or `/donor/demo/dashboard`) → review channels → enable one → save → UI reflects the
change → disable → save → state reverts. Each channel shows what it is for, availability
depends on future provider configuration, and every demo save states plainly:
**"…saved in this browser. No message was sent."**

Tests: `tests/e2e/donor-demo.spec.ts`, unit `demo-validation`.

---

## Secondary journeys

| Journey | Flow | Layer |
| --- | --- | --- |
| Donor receives a request | Notification preview (simulated) → `/respond/[token]` → "I could help" / "Unavailable" → confirmation → availability/preferences adjust | API (token link), display only |
| Blood-bank representative | `/org` → inventory edit with confirmation → audit-stamped update; or `/org/demo` preview with synthetic data | API / Mock |
| Administrator | `/admin` → verification queue → verify with note → audit; or `/admin/demo` preview with synthetic data | API / Mock |
| Report abuse | `/abuse` → form → stored report + confirmation | API |
| Language switch | any page → `Language` control → same path in the other language, `html[lang]` updates | client |
| Recovery from error | 404/401/403/500/unavailable/maintenance pages → homepage or Find Blood links | static |
