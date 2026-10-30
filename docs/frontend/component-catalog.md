# Component catalog

All frontend components, grouped by the reorganised folders in `src/components/`.
Shared primitives live in `ui/`; everything else is feature-owned.

Import paths are alias-based: `@/components/<folder>/<name>`.

## 1. `ui/` — primitives

| Component | File | Purpose / variants |
| --- | --- | --- |
| `Badge` | `ui/ui.tsx` | Status/verification chip. Tones: `brand, teal, amber, danger, neutral, info`. Always carries text — never colour alone |
| `Callout` | `ui/ui.tsx` | Inline explanation/warning with tone + optional `title`; supports `role="status"` for async messages |
| `Breadcrumbs` | `ui/ui.tsx` | Page trail from `Crumb[] { href, label }` |
| `PageHeader` | `ui/ui.tsx` | Eyebrow, H1, subtitle, breadcrumbs, right-hand actions — used by every inner page |
| `SectionHeading` | `ui/ui.tsx` | H2/H3 section title + optional description and action slot |
| `TextLink` | `ui/ui.tsx` | Consistent inline/arrow link |
| `EmptyState` | `ui/ui.tsx` | Icon + title + children (next steps). Used for "no results", "no profile", "no requests" |
| `DemoBanner` | `ui/ui.tsx` | Mandatory notice on demonstration surfaces |
| `EmergencyNote` | `ui/ui.tsx` | Standard emergency disclaimer block |
| `Stat` | `ui/ui.tsx` | Labelled figure for dashboards (no fabricated numbers) |
| `Skeleton` / `LoadingBlock` | `ui/ui.tsx` | Loading placeholders with an accessible label; replaces spinners |
| `Pagination` | `ui/ui.tsx` | Prev/next + page list for tables |
| `CopyButton` | `ui/copy-button.tsx` | Copies a share link, announces "Copied", resets after 2.5s, degrades if Clipboard API is unavailable |
| `DocPageView` | `ui/doc-page.tsx` | Renders a structured content page (sections + blocks) for learn/legal pages |
| `SystemState`, `HomeLink` | `ui/system-state.tsx` | 404/401/403/500/unavailable/maintenance screens with recovery actions |
| `icons.tsx` | `ui/icons.tsx` | 26 stroke icons (see design system §7) |

## 2. `layout/` — page chrome

| Component | Notes |
| --- | --- |
| `SiteHeader` | Wordmark, primary nav (Find Blood, Blood Banks, Donation Camps, Become a Donor, Learn), language switcher, Dashboard/Sign in. Server-rendered; keeps "Find Blood" first |
| `MobileMenu` | Accessible drawer (`#mobile-nav`), labelled trigger, Escape closes, focus returns to trigger, body scroll lock |
| `SiteFooter` | Link groups (Find / Participate / Learn / Trust) + emergency disclaimer |
| `LanguageSwitcher` | `en ⇄ ne` preserving the current path |

## 3. `blood-search/` — discovery

| Component | Notes |
| --- | --- |
| `FindForm` | Accessible form: `BloodGroupPicker` (incl. "Not sure"), district select, optional radius, hospital text, submit. Client-side validation with inline errors; used on the homepage (compact) and `/find` |
| `BloodGroupPicker` | Grouped radio-style grid of the 9 choices with Nepali labels; keyboard navigable; never preselects a group |

## 4. `auth/`

| Component | Notes |
| --- | --- |
| `OtpLoginForm` | Two-step phone → OTP flow calling `@/services/api`; honours `next` return path; surfaces rate-limit (429) and invalid-code errors inline |

## 5. `request/` — the core workflow

| Component | Notes |
| --- | --- |
| `RequestForm` | Step-based real request form (requirement → location → requester → consent → review) with Zod-backed server validation, preserved values on error |
| `RequestOwnerActions` | Owner-only actions on a request: copy share link, notify more, close/cancel with confirmation |
| `ResponseButtons` | Donor response actions on `/respond/[token]`: "I could help" / "Unavailable" + note, with confirmation state |

## 6. `donor/`

| Component | Notes |
| --- | --- |
| `DonorRegistrationForm` | Registration with blood group, sex, location, availability window, channels, per-purpose consents (none preselected) |
| `DonorControls` | Availability (available/unavailable/paused), per-channel toggles, consent review/withdraw, response history |

## 7. `organization/` and `admin/`

| Component | Notes |
| --- | --- |
| `InventoryForm` | Group × component units entry; requires the "reported, not estimated" confirmation before saving; shows last-updated |
| `AdminOrgActions` | Verify/reject organisation with reviewer note |
| `AdminAbuseActions` | Resolve/dismiss abuse reports with reason |
| `AdminCampForm` | Create/edit donation camps |

## 8. `feedback/`

| Component | Notes |
| --- | --- |
| `AbuseReportForm` | Public reporting form with category, description and privacy note |

## 9. `demo/` — demonstration surfaces (labelled, browser-local, `noindex`)

| Component | Notes |
| --- | --- |
| `DemoRequestWizard` | 4-step request wizard (need → location → contact → review), Zod validation, confirmation with share link; stores in `localStorage` |
| `DemoRequestStatus` | Status timeline (created/viewed/updated/cancelled), copy link, cancel with `alertdialog` confirmation |
| `DemoRequestEdit` | Loads a demo request then reuses the wizard |
| `DemoDonorRegistration` | 3-step donor registration with explicit consent gate |
| `DemoDonorDashboard` | Profile completeness, availability radio group, channel/consent toggles, request previews, response history, delete-profile confirmation |
| `DemoContactForm` | Contact form that records locally and states plainly that nothing was sent |
| `OrgDemoDashboard` | Blood-bank dashboard preview: inventory table with freshness, request queue, camps |
| `AdminDemoDashboard` | Admin preview: overview, requests, donors, banks, verification queue, notification logs, reports, abuse, activity, settings — synthetic data only |

## 10. Composition rules

1. Feature components import primitives from `@/components/ui/*`; primitives never import
   feature components.
2. Components never fetch ad-hoc: they call typed helpers in `@/services/api` (real) or
   `@/mocks/*` (demonstration).
3. Every form surfaces errors next to the field and preserves entered values.
4. Every demonstration surface renders `DemoBanner`.
5. Server components stay server-side; `"use client"` only where interaction requires it.
