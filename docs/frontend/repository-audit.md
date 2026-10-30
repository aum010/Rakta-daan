# Frontend repository audit

Audited 27 October 2026 before any frontend reorganisation, per the frontend master prompt
(Phase One). Nothing in this audit was deleted; every change made afterwards is listed in §5.

## 1. Stack found in the repository

| Area | Found |
| --- | --- |
| Framework | **Next.js 16** (App Router, React 19), TypeScript 5.9 |
| Styling | **Tailwind CSS 4** via `@tailwindcss/postcss`, tokens in `src/app/globals.css` (`@theme`) |
| UI library | **No shadcn/ui, no Lucide** — a hand-built component set (`src/components/ui`) plus one inline SVG icon module (`icons.tsx`) |
| Forms | Controlled React forms + **Zod** schemas (`src/lib/validation`, `src/mocks/*Schema`) — React Hook Form is *not* used |
| State | Component state + small module stores; **no Zustand** (not needed) |
| i18n | Two dictionaries `src/messages/en.ts`, `src/messages/ne.ts` with `/[locale]` routing |
| Tests | **Vitest** (unit + integration) and **Playwright** (e2e) |
| Lockfile | `pnpm-lock.yaml`, `pnpm-workspace.yaml` |
| Config | `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts` |

Decision: the existing stack is compatible with the frontend prompt's default stack, so it
was **preserved**. No framework, icon library, form library or state library was added —
adding shadcn/ui or Lucide on top of an established home-grown system would have created the
duplicate design system the prompt forbids. (Documented in
[assumptions-and-decisions](../product/assumptions-and-decisions.md) as D18–D22.)

## 2. What already works (verified by command, 27 Oct 2026)

| Capability | Evidence |
| --- | --- |
| 45 public/account/demo routes render | `pnpm build`, Playwright 16/16 |
| Search + results + guidance flow | `tests/e2e/home-find.spec.ts` |
| Request creation (real, authenticated) and demo request wizard | `pnpm test` integration, `tests/e2e/request-demo.spec.ts` |
| Donor registration console + labelled demo donor flow | `tests/e2e/donor-demo.spec.ts` |
| Org/admin dashboard previews with synthetic data | `tests/e2e/previews.spec.ts` |
| System/404/legal/learn pages | `tests/e2e/system-pages.spec.ts` |
| Bilingual interface | i18n unit tests + language-switch e2e |
| Unit/integration tests | 105 passing against real PostgreSQL |
| HTTP smoke (OTP → request → donor response → org/admin permission checks) | 24/24 |

## 3. What was incomplete or weak at audit time

1. **`src/components` was a flat folder of 28 files** mixing primitives, layout, forms,
   dashboards and demo screens — hard to scan and easy to duplicate.
2. **No `services/` or `mocks/` layer** — the client fetch helper (`lib/client-api.ts`) and
   the browser-local demo store (`lib/demo/*`) sat inside domain `lib/` next to server code.
3. **No README, no frontend documentation set.**
4. Duplicate demo-state plumbing in several components (superseded by `useDemoDataVersion`).

## 4. What must not be changed (and was not)

* `src/db/**`, `drizzle/**`, `drizzle.config.ts`, `docker-compose.yml` — database schema and
  migrations untouched.
* `src/app/api/**` — no backend API was built, modified or removed for this phase.
* `src/lib/{crypto,matching,requests,messaging,retention,...}` — server-side domain logic.
* Existing routes and features — no page was deleted; no duplicate design system introduced.

> Note on scope: this repository already contained a working **full-stack** implementation
> from a previous phase. The frontend prompt's protection rules ("if the repository already
> contains a functioning frontend: do not delete it, do not reset, do not replace") apply, so
> this phase **organised and documented** the frontend rather than stripping the backend out.
> Removing working backend code would have violated a stricter rule of the same prompt.

## 5. Changes made in this reorganisation

### 5.1 `src/components` grouped by responsibility

```
src/components/
├── ui/            ui, icons, copy-button, doc-page, system-state
├── layout/        site-header, site-footer, mobile-menu, language-switcher
├── blood-search/  find-form, blood-group-picker
├── auth/          otp-login-form
├── request/       request-form, request-owner-actions, response-buttons
├── donor/         donor-registration-form, donor-controls
├── organization/  inventory-form
├── admin/         admin-actions
├── feedback/      abuse-report-form
└── demo/          demo-request-wizard, demo-request-status, demo-request-edit,
                   demo-donor-registration, demo-donor-dashboard, demo-contact-form,
                   org-demo-dashboard, admin-demo-dashboard
```

### 5.2 New top-level frontend layers

| From | To | Why |
| --- | --- | --- |
| `src/lib/client-api.ts` | `src/services/api.ts` | The prompt's `services/` layer: the single place page components call for API access |
| `src/lib/demo/*.ts` | `src/mocks/*.ts` | The prompt's `mocks/` layer: browser-local demo stores, separated from server code |
| `src/lib/demo/hydrated.ts` | `src/hooks/use-has-mounted.ts` | The prompt's `hooks/` layer |
| `src/data/demo.ts` | `src/mocks/fixtures.ts` | Synthetic fixtures live with the mock layer |

`src/data/geography.ts` stays: it is **reference data** (provinces/districts), not mock data.

### 5.3 Result

* 36 files moved, import specifiers rewritten in 70 files.
* Verified afterwards: `pnpm typecheck`, `pnpm lint`, `pnpm test` (105), `pnpm build`,
  `pnpm test:e2e` (16/16) — all pass.

## 6. Recommended next steps (not done here)

* Wire `pnpm test:e2e` into CI alongside `pnpm verify`.
* Split the very large demo components (950-line wizard, 560-line donor dashboard) into
  step-level sub-components when they next change.
* Introduce `src/features/**` only if a feature grows beyond one folder — premature for now.
