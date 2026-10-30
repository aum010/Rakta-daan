# Frontend testing

## 1. Test layers

| Layer | Tool | Scope | Command |
| --- |---|---|---|
| Unit | Vitest | Blood compatibility, phone parsing, crypto, dates, i18n parity, matching, validation, consent/messaging rules, demo schemas/stores, coordination domain (waves, request machine, eligibility, scenarios) | `pnpm test` |
| Integration | Vitest + real PostgreSQL | Availability summary (k-anonymity, freshness, radius), request lifecycle, outbox/consent/opt-out/idempotency, rate limiting | `pnpm test` |
| End-to-end | Playwright (Chromium) | Seven journeys (incl. the full mobile coordination journey at 390px) + automated WCAG audit against a real dev server | `pnpm test:e2e` |
| Accessibility | Playwright + axe-core (WCAG 2.1 A/AA ruleset) | 15 audits: 11 routes across both locales, dynamic wizard state, populated results, 390px viewport, open mobile menu | `pnpm test:e2e` (part of the same run) |
| HTTP smoke | `scripts/smoke.ts` | Full API surface incl. permissions, rate limits, webhooks | `SMOKE_BASE_URL=… pnpm smoke` |
| Static | `tsc` + `eslint` | Types, unused code, React hooks rules | `pnpm typecheck`, `pnpm lint` |

## 2. Unit + integration inventory (18 files, 180 tests)

```
tests/unit/blood.test.ts            compatibility rules, labels, components
tests/unit/coordination-waves.test.ts      candidate scoring/ranking, wave windows, simulated responses (24)
tests/unit/coordination-request.test.ts    allocation, accept/arrive/donate/confirm/close transitions (15)
tests/unit/coordination-eligibility.test.ts eligibility display rules, conversation authorisation, contact-disclosure consent (22)
tests/unit/coordination-scenarios.test.ts  seeded scenarios, reset, conversation privacy, location-consent defaults (14)
tests/unit/phone.test.ts            977 normalisation, validation
tests/unit/crypto.test.ts           AES-GCM round-trip, blind index, purpose binding
tests/unit/dates.test.ts            formatting, relative time, staleness maths
tests/unit/i18n.test.ts             en/ne parity, placeholder counts, htmlLang
tests/unit/matching.test.ts         eligibility, cooldown, radius, scoring (12)
tests/unit/validation.test.ts       request/donor input schemas
tests/unit/messaging.test.ts        templates, simulated-not-delivered states
tests/unit/demo-id.test.ts          demo reference create/normalise/validate
tests/unit/demo-store.test.ts       localStorage store behaviour
tests/unit/demo-validation.test.ts  demo wizard/registration schemas incl. consent gates
tests/integration/availability.test.ts  donor count hiding, freshness, radius, rate limits
tests/integration/requests.test.ts      creation, encryption at rest, sharing, close/expiry
tests/integration/outbox.test.ts        dispatch, consent re-check, opt-outs, idempotency
```

Shared helpers: `tests/helpers.ts` (db reset, factories), `tests/setup.ts` (env),
`tests/global-setup.ts` (creates + migrates `rakta_daan_test`).

## 3. Playwright journeys (9 spec files, 39 tests)

| Spec | Journey | Covers |
| --- |---|---|
| `home-find.spec.ts` | A + E | Homepage hierarchy, "Find Blood Now", search validation, results, "Not sure" guidance, language switch, mobile menu |
| `request-demo.spec.ts` | B | Wizard validation → confirmation → status → edit → cancel |
| `donor-demo.spec.ts` | C + F | Registration with consent gate, dashboard, availability, preferences, respond, delete → empty state |
| `system-pages.spec.ts` | D+ | Learn/FAQ flow, contact form validation and honest "nothing was sent", trust pages, 404 recovery, system states, robots/sitemap/manifest |
| `previews.spec.ts` | org/admin | Inventory confirmation flow, admin section navigation, synthetic status change |
| `mobile-app.spec.ts` | mobile emergency journey | The complete 390px journey: five-tab bottom navigation → Profile → load demo scenario → track coverage → map/waves honesty notes → donor accepts → coverage recalculates → external contact with details hidden until consent → channel status honesty → reset; plus sticky-footer tests asserting the bar stays fixed at the viewport bottom after deep scrolling at 390px and 1280px, and that it is already pinned from the first pixel, above the site footer; plus a profile upload test asserting the avatar and a certificate are resized and rendered from a data URL, that no non-GET request leaves the browser while either is handled, and that both remove back to their empty states |
| `accessibility.spec.ts` | a11y | axe-core audit (WCAG 2.1 A/AA) of every key route in `en` and `ne`, plus dynamic states |
| `bottom-nav.spec.ts` | tab bar pinning | Every one of 16 routes in both locales, measured at scroll position 0: computed **and** inline `position: fixed`, bottom flush with the viewport, nothing painted above it; plus a test that strips every stylesheet from the document and asserts the bar still pins |
| `responsive-tiers.spec.ts` | layout tiers | Real geometry at 390 / 768 / 1440: single column on a phone, two columns on a tablet, three columns on a desktop, the page container widening past 1150px, and the tab bar's targets growing with the viewport instead of staying phone-sized |

Config: `playwright.config.ts` — single worker, retries in CI, `Asia/Kathmandu` timezone,
`baseURL` from `E2E_BASE_URL` (default `http://localhost:3100`), starts its own dev server,
traces and screenshots retained on failure. If `E2E_BASE_URL` is set, the `webServer` block is
skipped and the suite runs against that already-running server — this is how you run e2e while
a preview dev server is up, because Next.js allows only one dev server per project directory.

## 4. Smoke test (24 checks)

OTP request/verify/logout · request creation · matching notified donors · messages reported
`simulated` (never delivered) · availability hides identities · public request page loads and
hides requester phone/name · donor token response · requester sees consenting donor's contact
· dashboards render · cross-origin mutation 403 · non-admin 403 · org inventory 403 for
outsiders · admin verify 200 · bank page shows reported units · rate limit 429 · webhook 401 ·
cron 401 · cleanup and fixture restore.

## 5. Results (latest run 30 October 2026, after the 404-document fix)

| Command | Result |
| --- | --- |
| `pnpm typecheck` | ✅ 0 errors |
| `pnpm lint` | ✅ 0 problems |
| `pnpm test` | ✅ 18 files / **180 tests passed** |
| `pnpm build` | ✅ production build |
| `pnpm test:e2e` | ✅ **40/40 passed** (9 spec files; incl. 15 axe audits, 0 violations) |
| `pnpm smoke` (server on :3010) | ✅ **24/24 passed** (28 October) |

Failures found and fixed during this cycle (not hidden):
* Flaky rate-limit test crossing a minute boundary → clock pinned inside the test.
* Seven Playwright expectations that did not match correct UI (heading vs. callout title,
  `lang="ne-NP"` vs `ne`, duplicate text nodes, ambiguous buttons, placeholder vs. label) —
  assertions corrected to test the same intent; one contradictory assertion replaced with a
  positive one.
* First axe run failed all 15 audits on one rule, `label-content-name-mismatch` (serious): the
  language switcher's `aria-label` ("Language"/"भाषा") did not contain its visible text
  ("नेपाली"/"English") — a WCAG 2.5.3 failure. Fixed by composing the accessible name as
  `"Language: नेपाली"`; `home-find.spec.ts` now matches the name by prefix.
* `pnpm lint` started failing on Playwright's generated `playwright-report/` and
  `test-results/` bundles after the e2e runs grew traces — both directories added to
  `eslint.config.mjs` ignores (generated artifacts, not source).
* **29 October (profile + responsive pass):** two journey assertions still pointed at copy
  that had moved ("Contact hidden" / "Show my number" → "Hidden until shared" / "Share
  details"). The behaviour they guard — contact hidden until its owner opts in — was
  unchanged, so the expectations were updated to the current labels rather than the flow
  weakened. The switch-to-donor assertion moved with the role switcher into the profile's
  collapsed Settings group, so the test opens it first.
* A literal `{date}` leaked into the profile's "Last donation" row (it borrowed a format
  string from another dictionary block) and the Track / Demo-scenarios link cards repeated
  their section's copy — dedicated keys added in both locales.
* **30 October (404 document pass):** with the only root layout in `app/[locale]/layout.tsx`,
  a plain `app/not-found.tsx` was rendered *inside* Next's default document, so an unmatched
  URL emitted nested `<html>`/`<body>` tags and a React hydration warning. Moved the document
  to `app/global-not-found.tsx` (enabled with `experimental.globalNotFound`), removed the
  duplicate root not-found, and stopped the locale layout from calling `notFound()` itself
  (an unknown locale such as `/fr/find` previously produced Next's empty error document).
  `system-pages.spec.ts` now asserts the raw 404 markup contains exactly one `<html>`/`<body>`
  and that unknown locales and missing records still render a recoverable 404 page.
* `responsive-tiers.spec.ts` timed out on its first run: a fresh browser profile holds no
  demo state, so `/app/track` renders its empty state instead of the panel under test — the
  test now seeds a scenario first. Two type errors it introduced (unchecked array index under
  `noUncheckedIndexedAccess`, and `Boolean(x) &&` which does not narrow) were fixed with a
  `pair()` helper rather than suppressed.

## 6. Running everything

```bash
pnpm verify        # typecheck + lint + unit/integration + build
pnpm test:e2e      # starts its own dev server on 3100 (stop manual servers first —
                   # Next allows one per directory)

# Reuse an already-running server instead (e.g. a preview on 3010):
E2E_BASE_URL=http://localhost:3010 pnpm test:e2e

# Smoke: needs a dev server started with DEV_EXPOSE_OTP=true and a migrated, seeded DB
DEV_EXPOSE_OTP=true pnpm exec next dev -p 3010
SMOKE_BASE_URL=http://localhost:3010 pnpm smoke
```

## 7. Not covered

* Cross-browser (Firefox/WebKit) — Chromium only.
* Visual regression snapshots.
* Lighthouse / Core Web Vitals collection (axe audits do run automatically — see below).
* Load/performance testing (see performance notes in the completion report).
* CI wiring — `pnpm verify`, `pnpm test:e2e`, `pnpm smoke` are ready to be scheduled.
