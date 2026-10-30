# Design system

Rakta-Daan's visual language: warm, calm, healthcare-serious, Nepal-relevant. Tokens live in
**`src/app/globals.css`** under `@theme` (Tailwind 4) — no hard-coded colours elsewhere.

## 1. Visual direction

* **Warm neutral canvas** (`#fffaf7`) with white surfaces — not the cold blue of generic
  dashboards, not an all-red emergency look.
* **Restrained crimson brand** used for the primary action and key emphasis only; large
  areas stay neutral so red keeps its meaning.
* **Teal = confirmed/positive**, **amber = needs attention/stale**, **danger = destructive or
  blocking**, **info = neutral explanation** — each paired with an icon or text, never colour
  alone.
* Rounded geometry (`0.625rem`–`1.75rem`), soft layered shadows, hairline borders.

## 2. Colour tokens

| Group | Tokens |
| --- | --- |
| Canvas/surface | `canvas #fffaf7`, `surface #ffffff`, `surface-muted #fdf3ef`, `surface-deep #f7e9e3` |
| Text | `ink #1d1512`, `ink-soft #4a3b35`, `muted #6f5f58` |
| Border | `line #ecdfd8`, `line-strong #dcc9bf` |
| Brand (crimson) | `brand-50 … brand-900`, core `brand-600 #b01722`, hover `brand-700`, focus ring `brand-600` |
| Status | `teal-700/800` success · `amber-700/800` warning/stale · `danger-700/800` error · `info-700` info (with `-50`/`-100` tints) |

Semantic tones are exposed to components as `BadgeTone = brand | teal | amber | danger |
neutral | info`, so status colour cannot drift between components.

## 3. Typography

* Stack: **Inter → Segoe UI → system-ui → Noto Sans Devanagari → Mukta**, with
  `font-synthesis-weight: none` and `text-rendering: optimizeLegibility`.
* Devanagari-capable by construction (no separate font loading cost; system fonts first).
* Scale in use: `display-title` (hero), `h1` page title via `PageHeader`, `section-title`,
  body 16px base, `label` (form labels), `hint`/`caption` (0.875rem+), badge text 0.72rem
  uppercase with tracking for eyebrows only.
* Headings use `text-wrap: balance`, paragraphs `text-wrap: pretty`.
* No text below 12px; body copy uses default 16px (avoids mobile zoom-on-focus issues).

## 4. Spacing, radius, elevation, motion, layout

| Group | Tokens |
| --- | --- |
| Layout containers | `container-page` = 72rem, `container-reading` = 46rem, 1rem inline padding |
| Section rhythm | `section-block` 2.75rem → 4.25rem at ≥768px |
| Radius | `radius-xl 1rem`, `radius-2xl 1.35rem`, `radius-3xl 1.75rem` |
| Shadows | `shadow-xs / sm / md / lg` (warm-tinted, layered) |
| Motion | `duration-fast 120ms`, `base 180ms`, `slow 320ms`, `ease-out-soft cubic-bezier(.22,1,.36,1)` |
| Breakpoints | Tailwind defaults (`sm 640`, `md 768`, `lg 1024`, `xl 1280`); layouts switch at `md` |
| Reduced motion | Global `prefers-reduced-motion` override (durations → 0.001ms, no hover transform) |

## 5. Focus, selection, interaction

* Global `:focus-visible` → 3px `brand-600` outline, 2px offset, 4px radius (visible on every
  interactive element, including inside cards).
* `::selection` uses `brand-100`.
* Form controls inherit the font; native selects/inputs use `.input-base`.

## 6. Primitives (CSS classes)

```
layout      container-page · container-reading · section-block · hairline · surface-grid
type        display-title · section-title · section-copy · eyebrow · prose-page
forms       field · label · input-base · input-error · field-error · hint
actions     button-primary · button-secondary · button-ghost (+ :disabled states)
selection   blood-group-option · choice-card · chip
surfaces    card · card-hover · demo-banner · data-table · skeleton · progress-track/fill
states      badge (tones) · step-number
```

Rules:
* Buttons: one primary per view; secondary for alternatives; ghost for tertiary. Disabled
  state is visible and non-interactive.
* `card-hover` is progressive polish only — every card works without hover (touch).
* `.demo-banner` is the mandatory marker for every demonstration surface.

## 7. Iconography

A single hand-built 24×24 stroke set (`src/components/ui/icons.tsx`, `currentColor`,
1.6–1.8 stroke): droplet, search, pin, clock, shield, alert, check/check-circle, heart,
users, building, calendar, phone, lock, info, external, chevron, sliders, file, bell,
settings, clipboard, book, menu, close, arrow.

* No emoji as interface icons; no third-party icon pack mixed in (adding Lucide alongside an
  established 26-icon set would create a second icon language).

## 8. Component behaviour conventions

| Concern | Convention |
| --- | --- |
| Page chrome | `PageHeader` (eyebrow, title, subtitle, breadcrumbs, actions) on every inner page |
| Status | `Badge` with tone **and** a text label |
| Explanation | `Callout` (tone + optional title), used for safety and consent |
| Empty | `EmptyState` with an icon and a next action inside |
| Loading | `Skeleton` / `LoadingBlock` — never a bare spinner, never a permanent state |
| Error | `SystemState` (404/401/403/500/unavailable/maintenance) with recovery links |
| Demo data | `DemoBanner` + `noindex` + synthetic fixtures |
| Share | `CopyButton` with "Copied" feedback and a timeout reset |
| Tables | `data-table` with sticky header on mobile scroll |

## 9. Contrast and honesty checks

* `ink` on `canvas`: near-black on warm white ≈ 16:1 (AAA for body text).
* `brand-700` on `canvas` ≈ 7:1 for small text; `brand-600` reserved for large text/fills.
* Status colours are always paired with words (`Verified`, `Stale`, `Demo data`), so meaning
  survives greyscale and colour-vision differences.

## 10. Adding to the design system

1. Prefer an existing token/class before inventing one.
2. New semantic colour → add to `@theme` **and** expose it as a `BadgeTone`/callout tone so it
   can be used consistently.
3. New primitive → add the CSS class in `globals.css` `@layer components`, then document it
   in [component-catalog.md](component-catalog.md).
