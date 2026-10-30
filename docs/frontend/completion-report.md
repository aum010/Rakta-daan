# Rakta-Daan — frontend completion report

Scope: **frontend design, UX, responsive website and interactive prototype**
(frontend master prompt), followed by the **final master prompt: mobile-first emergency
blood coordination platform** (maps, smart matching, multi-donor coordination,
communication, donation history — frontend only). Reported items were executed in this
repository on 27–28 October 2026 unless stated otherwise.

## 1. Repository audit findings

Full audit: [repository-audit.md](repository-audit.md). Summary: Next.js 16 + TypeScript +
Tailwind 4 with a home-grown component system (no shadcn/ui, no Lucide, no React Hook Form,
no Zustand), Vitest + Playwright already configured, a working backend from a previous phase.
The stack was compatible with the prompt's defaults and was preserved. Weaknesses found:
a flat 28-file `components/` folder, no `services/`/`mocks/`/`hooks/` layers, no README or
frontend documentation.

## 2. Competitor research findings

[competitive-analysis.md](competitive-analysis.md) + [ux-opportunities.md](ux-opportunities.md).
Notable: **RaktKhoj was fetched successfully this cycle** — it is an India-focused demo
prototype that labels itself "a demo site, should not be used for real emergencies", with a
one-screen search that falls back from bank stock to donors (no dead ends). NVBDS publishes a
consent-based phone-reveal rule; Hamro Rakta Sanjal documents OTP-as-number-verification and
availability windows; NRCS is a centre directory with public phone numbers. BloodBankNepal's
interface could not be inspected (**not verified**). Market-wide gap we exploit: freshness
and verification claims without timestamps or defined methods.

## 3. Final sitemap

[information-architecture.md](information-architecture.md) — 45 routes under `/en` and `/ne`:
public discovery (home, find, guidance, banks, camps, request pages, learn, trust/legal),
account (login, dashboard ×3), consoles (donor, org, admin), system states, plus eight
clearly-labelled `noindex` demonstration routes.

## 4. Design-system decisions

[design-system.md](design-system.md): warm canvas `#fffaf7` + restrained crimson
`brand-600 #b01722`; teal/amber/danger/info semantics always paired with words; Inter with
Noto Sans Devanagari fallback; token classes in `globals.css` (`card`, `button-*`, `field`,
`badge`, `chip`, `data-table`, `skeleton`, `demo-banner`…); global focus-visible ring;
reduced-motion override; 26-icon inline stroke set. No design system, icon pack or colour
palette was introduced alongside it.

## 5. Implemented frontend routes

45 pages: 25 public, 6 account/dashboard, 3 consoles, 4 system states, 8 demonstration,
plus 404. Server-rendered reads with metadata/robots/sitemap handled per route.

## 6. Implemented reusable components28 components in 10 folders: 16 primitives (`Badge`, `Callout`, `Breadcrumbs`, `PageHeader`, `SectionHeading`, `TextLink`, `EmptyState`, `DemoBanner`, `EmergencyNote`, `Stat`, `Skeleton`, `LoadingBlock`, `Pagination`, `CopyButton`, `DocPageView`, `SystemState`) plus the 26-icon set, and 19 feature components (11 production: `FindForm`, `BloodGroupPicker`, `OtpLoginForm`, `RequestForm`, `RequestOwnerActions`, `ResponseButtons`, `DonorRegistrationForm`, `DonorControls`, `InventoryForm`, admin actions, `AbuseReportForm`; 8 demonstration surfaces). Full catalog:
[component-catalog.md](component-catalog.md).

## 7. Implemented interactions

Search + validation + results/sorting/filtering and a "no results" recovery state;
4-step request wizard with review/consent/confirmation; request status timeline, edit and
cancel with confirmation dialog; donor registration with consent gate; availability switching;
per-channel preference toggles; respond-via-token; blood-bank directory + detail with
freshness; camp directory; org inventory editing with source confirmation; admin section
navigation with synthetic status changes; language switching preserving the route; mobile
drawer with Escape; copy-to-clipboard share links; loading/empty/error states with retry
paths. No button merely changes its own label.

## 8. Mock data and service architecture

[mock-data.md](mock-data.md): `src/mocks/` (localStorage stores, Zod schemas, fixtures) vs
`src/data/geography.ts` (real reference data). Every demo surface carries `DemoBanner` +
`noindex`; fixtures are synthetic and phone numbers use reserved ranges. Real pages read real
database rows and are never labelled demo. Service boundary:
[backend-integration-contract.md](backend-integration-contract.md) — single typed entry point
`src/services/api.ts`, uniform error envelope, documented swap path from mocks to API.

## 9. Responsive and accessibility work

[accessibility.md](accessibility.md): semantic landmarks, skip link, labelled controls,
inline announced errors, `alertdialog` confirmations, global focus ring, status never
colour-only, reduced-motion support, 390px-first layouts, both languages. Verified by
Playwright (skip link, mobile menu, `html[lang]`), an automated **axe-core WCAG 2.1 A/AA
audit of 15 route/state combinations in both locales (0 violations)**, and manual passes.
The audit's first run found and fixed one real defect: the language switcher's accessible name
omitted its visible label (WCAG 2.5.3).

## 10. Tests executed and actual results

| Command | Result |
| --- | --- |
| `pnpm typecheck` | ✅ 0 errors |
| `pnpm lint` | ✅ 0 problems |
| `pnpm test` | ✅ 18 files / **180 passed** (real PostgreSQL) |
| `pnpm build` | ✅ 45 pages + 20 API routes |
| `pnpm test:e2e` | ✅ **34/34 passed** (incl. 15 axe accessibility audits) |
| `pnpm smoke` (server :3010) | ✅ **24/24 passed** |

Detail and the list of defects found/fixed: [testing.md](testing.md).

## 11. Setup and run commands

All verified: `pnpm install` → `cp .env.example .env.local` → `pnpm db:up` →
`pnpm db:migrate` → `pnpm db:seed:demo` → `pnpm dev`. Tests: `pnpm verify`,
`pnpm test:e2e`, `pnpm smoke`. See [environment-setup.md](environment-setup.md).

## 12. Documentation created

`README.md` plus this set: repository-audit, competitive-analysis, ux-opportunities,
information-architecture, user-journeys, design-system, component-catalog, mock-data,
backend-integration-contract, localization, accessibility, testing, environment-setup,
seo-performance, acceptance-criteria, and this report. (Platform-phase docs remain under
`docs/` root, `docs/product`, `docs/research`.)

## 13. Known limitations

1. **Real vs. simulated:** public search/banks/camps/request pages are backed by the existing
   database; account creation and messaging in this phase were exercised through scripted
   HTTP smoke, not through a deployed environment.
2. **No real messaging** — `MESSAGING_PROVIDER=mock`; states are `simulated`, never
   `delivered`.
3. **Demonstration dashboards** (`/org/demo`, `/admin/demo`) are browser-local previews;
   their role switching is **not** security — backend authorization governs the real
   consoles.
4. **No Lighthouse/Core Web Vitals run** (the axe accessibility audit *is* automated and
   passing), no cross-browser matrix, no CI wiring.
5. **Nepali copy** awaits professional review; no legal validation is implied by translation.
6. **Performance** was measured from the production build (TTFB 9–30 ms local warm, HTML
   16 KB gzip, first-load JS 231 KB gzip) — see [seo-performance.md](seo-performance.md) for
   method and caveats; no Core Web Vitals numbers were collected, so none are claimed.
7. Municipality/ward-level geography not sourced; district-level only.

## 14. Backend integration requirements for the next phase

From [backend-integration-contract.md](backend-integration-contract.md):

1. Owner-scoped `GET /api/v1/requests/[publicId]` so the demo status page can move off
   localStorage without leaking contact details to link bearers.
2. `GET/PATCH /api/v1/donors/me` for availability, channels and consents (endpoint exists;
   wire the console UI to it rather than the demo store).
3. Server-enforced role checks for org/admin consoles — frontend role simulation must be
   removed from any production build.
4. Provider credentials + template/sender-ID approval, delivery-receipt webhooks, retry and
   opt-out enforcement (server side only).
5. Retention/audit behaviour already implemented server-side — keep the UI honest about
   scrubbed contact details.
6. CI job running `pnpm verify` + `pnpm test:e2e` + `pnpm smoke`.

## 15. Mobile-first emergency coordination platform (final master prompt)

Delivered 28 October 2026. Strictly **frontend only**: no backend implementation, no
database changes, no real message or call delivery, and no claim of real-time donor
tracking anywhere in the interface.

**Mobile-first structure.** A sticky, role-aware bottom navigation
(`src/components/mobile/bottom-nav.tsx`) that behaves like a native app footer: fixed to
the bottom of the viewport at every width (mobile and desktop), opaque so content never
shows through, safe-area aware, with `aria-current`
marking) with requester tabs (Home · Find · Request · Track) and donor tabs
(Home · Find · Request · Track · Profile), identical for every role. Routes: `/app`
(emergency home), `/app/location`, `/app/track`, `/app/donor`, `/app/profile`,
`/app/scenarios`, `/app/roles` — all `noindex`, all labelled demonstration surfaces.
There is no `/app/messages`: the product ships no in-app inbox (see
[external-contact-links.md](external-contact-links.md)).

**Domain layer** (`src/lib/coordination/`, pure and unit-tested): `request-machine.ts`
(invite → accept → arrive → donate → confirm → close transitions with coverage
recalculation), `waves.ts` (candidate scoring/ranking, wave windows, deterministic
simulated responses), `eligibility.ts` (display-only status — unknown eligibility is
never shown as eligible, nothing claims medical clearance), `candidates.ts`,
`scenarios.ts` (three seeded, resettable scenarios) and `store.ts` (localStorage-backed
external store with consent-per-purpose defaults).

**The required journey, implemented end to end:** MATCH (ranked candidates with
exclusion reasons) → ALERT WITH CONSENT (wave invitations, per-purpose location consent)
→ TRACK WITH CONSENT (coverage progress, participants lifecycle, map/list with a
"district-level positions only" disclaimer, activity timeline) → CONFIRM THE OUTCOME
(facility confirmation of units) → CLOSE THE REQUEST (request actions with confirmation).

**Contact** (Track → Contact tab, inline on donor invitations): external channels only —
calling simulated, WhatsApp/Viber/SMS not connected; contact details stay hidden until the
owner consents (`Contact hidden` → `Show my number`). **Donation history**: donor
dashboard with availability, answer/withdraw invitations, eligibility shown as display
status only, history records with verification labels. **Role previews** (`/app/roles`):
facility, coordinator and admin mobile views, labelled preview-only.

**Tests added this phase:** `tests/unit/coordination-scenarios.test.ts` (scenario
fixtures, reset, conversation privacy, consent defaults) plus four earlier coordination
unit files — 75 domain tests total — and `tests/e2e/mobile-app.spec.ts`, the complete
390px journey (navigation → scenario → tracking → map/waves honesty → accept →
coverage → contact consent → reset).

## Completed vs. simulated

| Completed (real) | Simulated (labelled) |
| --- | ---|
| All 45 routes, responsive layouts, design system, i18n, accessibility work | 8 demonstration routes with `localStorage` stores |
| Search, results, filters, empty states against real data | Dashboard previews with synthetic fixtures |
| Unit/integration/e2e/smoke test suites executed | Notification previews ("no real message has been sent") |
| Mobile coordination journey (`/app`) e2e-tested at 390px | Coordination domain state (localStorage, resettable demo scenarios) |
| Documentation set and verified commands | Simulated donor responses and call previews inside demo flows |
| Existing backend endpoints untouched and covered by tests | Live SMS/WhatsApp delivery (awaiting credentials) |
