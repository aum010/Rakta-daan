# Accessibility and responsiveness

Target: **WCAG 2.2 AA** where practicable. Below is what is implemented, verified by which
check, and what remains.

## 1. Implemented

### Structure and semantics
* Semantic landmarks: `header`, `nav`, `main`, `footer` on every page; one `h1` per page via
  `PageHeader`, then `SectionHeading` levels.
* Skip navigation link ("Skip to main content") as the first focusable element.
* `html[lang]` set correctly per locale (`en` / `ne-NP`).
* Descriptive `<title>` metadata per route; demo and private routes are `noindex`.

### Forms
* Every control has a real `<label>` bound with `htmlFor`/`id` (never placeholder-only).
* Inline, field-level errors tied to the control; errors are announced (`role="status"` /
  `aria-live="polite"` regions — 50 status/alert usages across components).
* Validation never relies on colour alone: error text + icon + message.
* Inputs are 16px so mobile browsers don't zoom on focus.

### Keyboard and focus
* Global `:focus-visible` ring (3px `brand-600`, 2px offset) on all interactive elements.
* Mobile menu: labelled trigger, `#mobile-nav` region, **Escape closes**, focus returns to
  trigger.
* Confirmation flows use `role="alertdialog"` with `aria-labelledby` (e.g. cancel-request).
* Blood-group picker is a keyboard-navigable radio-style group; no hover-only actions.

### Colour and motion
* Text tokens give ~16:1 (body) and ≥7:1 (brand-700 small text) contrast on the warm canvas.
* Status is **always** text + tone (`Verified`, `Stale`, `Demo data`, `Unavailable`), so
  greyscale and colour-vision differences don't lose meaning.
* Global `prefers-reduced-motion` rule zeroes animation/transition durations and disables
  hover transforms.

### Layout
* **Three layout tiers**, each shaped for its own width instead of one phone layout
  stretched onto a monitor:

  | Tier | Viewport | What changes |
  |---|---|---|
  | **Mobile** | < 768px | Single column, 1rem gutters; `/app` capped at `max-w-3xl` |
  | **Tablet** | ≥ 768px | 2rem gutters; peer cards go two-up — track overview (request + trip map), app home, donor dashboard, role previews, consent purposes, demo scenarios |
  | **Desktop** | ≥ 1280px | `--container-page` widens 72rem → 80rem and `/app` opens to `max-w-6xl` (1152px of content); card rows go three-up; the tab bar's targets widen 512px → 896px |

  The tiers live in `globals.css` (`--container-page`), the seven `/app` wrappers and the
  component grids; nothing in the mobile tier changes when a wider tier is added.
* Primary actions stay visible on small screens (hero CTAs, search submit, request/donate
  buttons) — no hover-only or desktop-only critical actions.
* No fixed-width tables; `.data-table` scrolls horizontally with a visible header.
* Tested viewports: 390×844 (mobile), 768 (tablet), 1024/1280+ (laptop/desktop), in both
  languages — the tier differences themselves are asserted by
  `tests/e2e/responsive-tiers.spec.ts`, which reads real geometry at 390/768/1440 rather
  than trusting class names.

## 2. Verification evidence

| Check | Result |
| --- |---|
| **axe-core automated audit** (`tests/e2e/accessibility.spec.ts`, WCAG 2.1 A/AA) | ✅ 15/15 audits pass: 11 routes in both locales, wizard step 2, populated results, 390px home + search, open mobile menu — **0 violations** of any impact |
| `tests/e2e/home-find.spec.ts` — skip link attached, mobile menu open/Escape-close, language switch sets `html[lang]` | pass |
| `tests/e2e/system-pages.spec.ts` — headings, recovery links, system states | pass |
| `pnpm lint` (React hooks/a11y-adjacent rules) | pass |
| Keyboard-only walkthrough of search → results → request form (manual) | performed during build |
| Both languages at 390px (manual) | performed during build |

## 3. Known gaps (honest list)

1. The automated audit covers `serious`/`critical` axe violations as a hard gate and logs
   minor/moderate ones; it cannot judge reading order, focus quality or label wording — those
   still need human review.
2. Some inline text links in dense legal copy are close to, but not guaranteed, ≥44px touch
   targets.
3. Nepali typographic tuning (line-height for Devanagari at small sizes) needs a designer's
   eye.
4. Screen-reader passes in both languages have not been recorded with a real AT tool.
5. No dedicated high-contrast/forced-colors review yet.

## 4. Rules for new work

1. New control ⇒ label + error handling + focus-visible + keyboard operation.
2. New status ⇒ text label + tone (never colour alone).
3. New animation ⇒ respects the global reduced-motion override.
4. New string ⇒ both dictionaries.
5. Critical action ⇒ visible at 390px without scrolling past the fold.
6. New route ⇒ add it to `ROUTES` in `tests/e2e/accessibility.spec.ts` so it is audited.
