# Information architecture and sitemap

Frontend scope: what a visitor can reach, who owns each surface, and which layer serves it.

## 1. Layer legend

| Layer | Meaning |
| --- | --- |
| **API** | Server-rendered page or route backed by the existing backend + database |
| **Mock** | Browser-local demonstration flow (`src/mocks/*`, `localStorage`), clearly labelled and `noindex` |
| **Static** | Content page from `src/content/pages.ts` or a dictionary |

## 2. Public pages

| Route | Purpose | Layer |
| --- | --- | --- |
| `/` | Homepage: emergency search panel, quick actions, trust, how it works, camps, FAQ | API (read-only) |
| `/find` | Search results: banks, donor count, freshness, filters | API |
| `/find/guidance` | "Not sure of the blood group" guidance (no guessing) | Static |
| `/banks`, `/banks/[slug]` | Blood-bank directory + facility detail with inventory freshness | API |
| `/camps`, `/camps/[id]` | Donation camp directory + detail | API |
| `/requests/[publicId]` | Public, shareable request page (no login to read) | API |
| `/respond/[token]` | Capability link a donor uses to respond | API |
| `/register` | Donor registration (OTP-authenticated) | API |
| `/for-donors`, `/for-organisations` | Role-oriented landing pages | Static |
| `/learn`, `/learn/faq`, `/learn/compatibility`, `/learn/donation-guide` | Education content | Static |
| `/about`, `/safety`, `/help`, `/contact`, `/abuse` | Trust, support and reporting | Static / API form |

### Legal and trust

`/privacy`, `/terms`, `/consent`, `/accessibility` — static content pages.

### System

| Route | Purpose |
| --- | --- |
| `/login` | Phone OTP sign-in |
| `/unauthorized`, `/forbidden`, `/unavailable`, `/maintenance` | Explained system states |
| 404 (`not-found`) | "That page is not here" with two recovery links (homepage in both languages + Find Blood) |

## 3. Requester account area

| Route | Purpose | Layer |
| --- | --- | --- |
| `/dashboard` | Own requests list | API |
| `/dashboard/requests/new` | Step-based request form (requirement → location → requester → consent → review) | API |
| `/dashboard/requests/[publicId]` | Request detail: responses, share, notify-more, close | API |

## 4. Donor and organisation consoles

| Route | Purpose | Layer |
| --- | --- | --- |
| `/donor` | Availability, channels, consent, response history | API |
| `/org` | Organisation inventory + profile | API |
| `/admin` | Verification queue, camps, abuse triage, audit | API |

## 5. Demonstration flows (labelled, browser-local, `noindex`)

| Route | Purpose |
| --- | --- |
| `/request/new`, `/request/status`, `/request/status/[ref]`, `/request/edit/[ref]` | 4-step request wizard, status timeline, edit — no account, no database |
| `/donor/demo`, `/donor/demo/register`, `/donor/demo/dashboard` | Donor registration, availability, preferences, responses |
| `/org/demo` | Blood-bank dashboard preview with synthetic inventory |
| `/admin/demo` | Admin dashboard preview with synthetic data |

Every one of these renders a `DemoBanner` and is excluded from the sitemap/robots index.

### Mobile coordination app (`/app`, browser-local, `noindex`)

| Route | Purpose |
| --- | --- |
| `/app` | App home: active request or the empty state, quick actions |
| `/app/track` | Overview with the **trip map** (donor ↔ receiver), coverage, coordination map, donor waves, **Contact**, activity |
| `/app/donor` | Availability, invitations, inline contact, donation history |
| `/app/profile` | Current view (avatar upload), collapsible groups — donor details, donation history + certificates, contact preferences, consent state, settings (role switch, reset) — plus every secondary section |
| `/app/location` | Four independent, reversible location-consent purposes |
| `/app/roles` | Facility, coordinator and admin mobile previews |
| `/app/scenarios` | Load a seeded scenario, or reset all demo data |

There is deliberately **no** `/app/messages`: the product has no in-app inbox. Contact is
external — see [external-contact-links.md](external-contact-links.md).

## 6. Navigation

**Bottom tab bar (all viewports, all roles):** `Home · Find · Request · Track · Profile`,
`position: fixed` to the bottom of the viewport for the whole document. Secondary pages are
not in the bar — they are reached from **Profile** or the header menu. See
[ux-decisions.md](ux-decisions.md) for why the set never changes with role.

**Header (desktop):** wordmark → Find Blood · Blood Banks · Donation Camps · Become a Donor ·
Learn, then language switcher and Dashboard/Sign in. Mobile collapses into a labelled drawer
(`#mobile-nav`) with Escape-to-close; "Find Blood" stays one tap away in both.

**Footer:** grouped links — Find (search, banks, camps), Participate (register, for donors,
for organisations), Learn (learn hub, FAQ, safety), Trust (privacy, terms, consent,
accessibility, report abuse), plus the emergency disclaimer. It ends above the tab bar, never
behind it.

**Breadcrumbs:** every inner page supplies `PageHeader.breadcrumbs`.

**Primary journey:** `/` emergency panel → `/request/new` (prefilled) → review → `/app/track`.

## 7. Suggested future tree (frontend prompt §15) mapped to reality

| Prompt suggestion | Where it lives here |
| --- | --- |
| `app/find-blood`, `app/blood-banks`, … | `src/app/[locale]/{find,banks,camps,request,register,donor,org,admin,learn}` — locale-aware routing preserved |
| `components/ui|layout|navigation` | `src/components/{ui,layout}` |
| `components/blood-search|donor|blood-bank|request|organization|feedback` | `src/components/{blood-search,donor,organization,request,feedback}` |
| `features/*` | Domain logic in `src/lib/*` (matching, requests, consent, messaging) — one folder per concern, no duplication |
| `services/` | `src/services/api.ts` |
| `hooks/` | `src/hooks/use-has-mounted.ts` (+ `src/mocks/use-demo-data.ts`) |
| `mocks/` | `src/mocks/*` (stores) and `src/mocks/fixtures.ts` (synthetic data) |
| `schemas/` | Zod schemas beside their domain (`src/lib/validation.ts`, `src/mocks/request.ts`, `src/mocks/donor.ts`) |
| `types/` | Types exported from the owning module (no orphan `types/` folder) |
| `styles/` | `src/app/globals.css` (tokens + component classes) |

Rationale for adaptation: Next.js App Router derives routing from `src/app`; splitting into a
parallel `features/` tree would have forced cross-tree imports without reducing complexity.
