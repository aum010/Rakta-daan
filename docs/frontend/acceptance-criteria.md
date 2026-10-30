# Acceptance criteria — verification against the frontend brief (§26)

Status is **evidence-based**: PASS = verified by a command run or a code reference; nothing
is marked PASS on assertion alone. Verified 27 October 2026; the mobile-first section below
was verified 28 October 2026.

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Homepage polished and responsive | PASS | `tests/e2e/home-find.spec.ts`; 390px–1280px passes; screenshots in `screenshots/` |
| 2 | "Find Blood Now" immediately visible | PASS | Hero CTA asserted by e2e (`getByRole("link", { name: "Find Blood Now" })`) |
| 3 | Blood-group and location selection work | PASS | e2e search journey + `FindForm`/`BloodGroupPicker` |
| 4 | Search results update with data | PASS | e2e asserts URL params, result headings, freshness labels; integration `availability.test.ts` |
| 5 | Empty and error states are helpful | PASS | no-results recovery block, `SystemState`, `EmptyState`, error boundary; e2e system-pages |
| 6 | Blood-bank details accessible | PASS | `/banks/[slug]` + e2e/smoke "public bank page shows reported units" |
| 7 | Request forms validate correctly | PASS | `tests/unit/validation.test.ts`, demo schema tests, e2e validation-error step |
| 8 | Demo request submission works | PASS | `tests/e2e/request-demo.spec.ts` full wizard → confirmation → status |
| 9 | Confirmation and status pages work | PASS | same spec (status timeline, edit, cancel) |
| 10 | Donor registration works in demonstration mode | PASS | `tests/e2e/donor-demo.spec.ts` (3-step registration + consent gate) |
| 11 | Donor availability controls work | PASS | same spec (availability radio → saved state) |
| 12 | Messaging preferences work in demonstration mode | PASS | same spec (channel toggles, "no message was sent") |
| 13 | Consent controls understandable | PASS | per-purpose, unchecked by default, blocking validation; unit `demo-validation` |
| 14 | Donor privacy reflected in UI | PASS | k-anonymity ("3+"), consent-exchange copy, no public donor phone in any response (smoke assertion) |
| 15 | Blood-bank and org dashboards navigable | PASS | `tests/e2e/previews.spec.ts`; real `/org` console smoke-tested |
| 16 | Administration pages navigable | PASS | `previews.spec.ts` (all sections) + `/admin` smoke 403/200 checks |
| 17 | English and Nepali supported | PASS | `tests/unit/i18n.test.ts` parity, e2e language switch, `/ne` route measured |
| 18 | Important interactions work on mobile | PASS | e2e mobile menu (390×844) + search journey |
| 19 | No native application created | PASS | no app/Flutter/React Native files or dependencies in `package.json` |
| 20 | No backend/database built or modified in this phase | PASS | [repository-audit §4](repository-audit.md) — `src/db`, `drizzle`, `src/app/api` untouched |
| 21 | No real messages sent | PASS | `MESSAGING_PROVIDER=mock`; smoke asserts `simulated ≥ 1` and never `delivered` |
| 22 | Mock data visibly identified | PASS | `DemoBanner` on every demo surface + `noindex`; `mock-data.md` labelling rules |
| 23 | No fake production verification/inventory claims | PASS | freshness computed from `updated_at`; demo fixtures separate; smoke asserts truthful states |
| 24 | No major dead buttons | PASS | e2e exercises every primary action; §7 of completion report lists interactions |
| 25 | Tests executed and results documented | PASS | [testing.md](testing.md): 180 unit/integration, 34 e2e, 24 smoke — all run 29 October 2026 |
| 26 | README and frontend documentation complete | PASS | `README.md` (links verified) + 17 files in `docs/frontend/` |

## Additional brief requirements spot-checked

| Requirement | Status | Evidence |
| --- | --- | --- |
| Search before sign-in (§6.A) | PASS | `/find` requires no account |
| "Not sure" → guidance, never a guess (§8.3) | PASS | `/find/guidance`, e2e |
| Radius/geolocation optional (§8.3, §19) | PASS | radius optional; no geolocation prompt exists (manual location entry) |
| Distinct verification labels (§9.2) | PASS | `BadgeTone` + text; demo/verified/stale labels distinct |
| Consent not bundled/preselected (§11.5) | PASS | separate per-purpose checkboxes, all unchecked |
| Sitemap/system pages implemented (§7) | PASS | 404/401/403/unavailable/maintenance + `error.tsx` retry |
| Robust error handling, no stack traces (§21) | PASS | `describeError()` localized copy; error boundary with reset |
| SEO: noindex of private/patient content (§22) | PASS (hardened this cycle) | 21 routes noindex; see [seo-performance.md](seo-performance.md) |
| Performance actually measured (§22) | PASS | measured numbers in [seo-performance.md](seo-performance.md) |
| Localisation of errors/empty states (§18) | PASS | all keys in both dictionaries (type-enforced) |
| Accessibility verified by automated audit (§17) | PASS (hardened this cycle) | 15 axe audits (WCAG 2.1 A/AA) pass with 0 violations; 1 WCAG 2.5.3 defect found and fixed — see [accessibility.md](accessibility.md) |

## Mobile-first emergency coordination platform (final master prompt)

Verified 28 October 2026. Evidence: `tests/e2e/mobile-app.spec.ts` (the complete 390px
journey) and the four coordination unit suites; full gate `pnpm verify` + 34 e2e + 24 smoke.

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| M1 | Mobile-first is structural, not responsive polish | PASS | Bottom navigation is the app's sticky footer: fixed at every viewport width (390×844 and desktop), safe-area aware, role-aware tabs; asserted pinned after deep scroll in `mobile-app.spec.ts` |
| M2 | Emergency journey matches MATCH → ALERT WITH CONSENT → TRACK WITH CONSENT → CONFIRM → CLOSE | PASS | domain `request-machine.ts` transitions + e2e: scenario → track → accept → coverage `1 / 3 committed` → reset |
| M3 | Smart donor matching is deterministic and never over-claims | PASS | `coordination-waves.test.ts` (24): unknown eligibility never shown as eligible, excluded candidates kept for explanation |
| M4 | Interactive map with consent-gated, honest location display | PASS | `CoordinationMap` map/list toggle; e2e asserts "District-level positions only. This prototype does not show live donor positions."; consent defaults all-off in `coordination-scenarios.test.ts` |
| M5 | Multi-donor coordination recalculates coverage from domain state | PASS | `coordination-request.test.ts` (15): committed/confirmed separation, withdrawal, facility confirmation |
| M6 | Communication is private, consent-gated and honestly labelled | PASS | `coordination-eligibility.test.ts` conversation authorisation + disclosure consent (22); e2e: contact hidden until "Show my number", channel badges read "Simulated only" / "Not connected", and the panel states "No message, call or SMS is delivered from this prototype" |
| M7 | Donation history and eligibility are display-only | PASS | `coordination-eligibility.test.ts` (22): missing data → `requires_review`, never `eligible`; no medical-clearance claim |
| M8 | Demo scenarios load and reset | PASS | `coordination-scenarios.test.ts` (14) + e2e reset → `Demo data reset.` → `No active request` |
| M9 | Frontend only: no backend, database or messaging changes | PASS | this phase touched only `src/lib/coordination`, `src/components`, `src/app/[locale]/app`, dictionaries and tests; `src/app/api`, `src/db`, migrations untouched |
| M10 | Full test gate green after the phase | PASS | typecheck 0 · lint 0 · 180 unit/integration · build ✅ · e2e 34/34 (15 axe audits) · smoke 24/24 |

## Outstanding (not blocking this phase)

1. Professional Nepali copy review and legal/medical review of both languages.
2. Lighthouse / Core Web Vitals measurement (the axe accessibility audit is now automated —
   `tests/e2e/accessibility.spec.ts`, 15 audits, 0 violations).
3. CI wiring for `pnpm verify`, `pnpm test:e2e`, `pnpm smoke`.
4. Browser matrix beyond Chromium; visual regression snapshots.
