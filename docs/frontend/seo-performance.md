# SEO and performance (measured)

Everything below was **measured**, not estimated, from the production build
(`pnpm build` → `next start`) served locally on 27 October 2026. Method and caveats in §4.

## 1. SEO configuration

| Item | Implementation | Status |
| --- | --- | --- |
| Page titles | Per-route `metadata`/`generateMetadata` (24 of 45 pages declare their own; layout provides the default + template) | ✅ |
| Descriptions | `dict.meta.*` in the locale layout | ✅ |
| Canonical | `alternates.canonical` per locale + `metadataBase` | ✅ |
| Hreflang | `alternates.languages` (`en-NP`, `ne-NP`, `x-default`) on layout and per sitemap entry | ✅ |
| Open Graph / Twitter | `openGraph` + `twitter` (summary card) in the locale layout | ✅ |
| Sitemap | `/sitemap.xml` — locale × 18 public paths, priorities, `changefreq` | ✅ |
| Robots | `/robots.txt` — disallows dashboards, consoles, login, private/dynamic links, demo routes, `/api/` | ✅ |
| Index control | `robots: { index: false }` on **21 routes**: all demo/system pages plus login, dashboard (+2), donor, org, admin, `/requests/[publicId]`, `/respond/[token]` | ✅ (hardened this cycle) |
| Manifest / icons | `/manifest.webmanifest`, `/icon.svg`, Apple touch icons | ✅ |
| Private content | Patient-specific request pages and capability links are `noindex` at the header level (not just robots.txt) | ✅ |

Rule applied: **robots.txt controls crawling, `noindex` controls indexing** — patient-specific
and private routes get header-level `noindex`; robots.txt entries are a second layer.

## 2. Measured performance (production build, local, warm)

| Route | TTFB (best of 3) | HTML size (raw) | Scripts referenced |
| --- | --- | --- | --- |
| `/en` | **0.030 s** | 85,234 B | 12 |
| `/en/find` | **0.012 s** | 40,697 B | 12 |
| `/en/banks` | **0.019 s** | 39,173 B | 11 |
| `/en/learn` | **0.012 s** | 55,184 B | 11 |
| `/ne` | **0.013 s** | 106,312 B | 12 |
| `/en/privacy` | **0.009 s** | 42,357 B | 11 |

Homepage payload:

| Asset | Measured (gzip transferred) |
| --- | --- |
| HTML | 16,238 B |
| First-load JavaScript (12 chunks) | **231,038 B** |
| CSS | 8,370 B |
| Largest single JS chunk | 71,971 B (framework/vendor) |

Other routes reference 11–12 scripts as well; `/ne` HTML is ~25 % larger than `/en` because
Devanagari strings are longer — expected and acceptable.

## 3. Performance properties of the implementation

* Public pages are **server-rendered** — content arrives in the first HTML response, so the
  page is readable/usable before hydration (critical on slow mobile networks).
* No image payload: the UI uses inline SVG icons and CSS (no raster hero), so there is no
  image optimisation or layout-shift risk from media.
* Fonts: system-stack first (Inter/Segoe/system/Noto Sans Devanagari/Mukta) — **zero font
  download**, no FOIT/FOUT, no third-party font requests.
* No animation libraries, no carousels, no third-party scripts or tag managers.
* Static public pages are prerendered (`○` in build output); dynamic data routes are `ƒ`.

### Observed opportunities (not yet done)

1. First-load JS of ~231 KB gzip is acceptable but not optimised: the demo dashboards and
   account consoles ship client code even for visitors who never open them — route-level
   `next/dynamic` splitting is the obvious next win.
2. No explicit bundle budget in CI.
3. No Lighthouse field/CI run (see caveats).

## 4. Method and caveats

```bash
pnpm build && pnpm exec next start -p 3010
curl -w "%{time_starttransfer} %{time_total} %{size_download}" http://localhost:3010/en
# chunk sizes: sum of gzip bytes for every /_next/static/*.js referenced by the HTML
```

* TTFB is **server-local** (same machine, no network, warm Next cache) — it measures render
  cost, **not** real-world latency. Real users add network RTT, TLS and any CDN.
* Numbers are best-of-three, uncompressed HTML unless stated.
* No headless-browser metrics (LCP/CLS/INP) were collected — do not quote Core Web Vitals
  numbers until a Lighthouse/CI run exists.
* Cold-cache first request to a dynamic route was not separately benchmarked.

## 5. How to reproduce

```bash
pnpm build
pnpm exec next start -p 3010
curl -s -o /tmp/home.html http://localhost:3010/en
grep -o '/_next/static/[^"]*\.js' /tmp/home.html | sort -u   # then fetch each with gzip
```
