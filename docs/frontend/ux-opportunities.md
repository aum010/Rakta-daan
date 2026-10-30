# UX opportunities

Derived from [competitive-analysis.md](competitive-analysis.md) and from walking our own
journeys. Each entry says whether it is **implemented**, **partly implemented** or
**proposed** — nothing here is claimed as done without a reference.

## 1. Requester-first speed

| Opportunity | Evidence from research | Status in Rakta-Daan |
| --- | --- | --- |
| Search before sign-in | Every platform that hides search behind login loses distressed users | **Implemented** — `/find` and the homepage search need no account |
| "Never a dead end" results | RaktKhoj explicitly falls back from stock to donors | **Implemented** — no-match state offers wider radius, other districts, blood banks, "submit a request" and facility guidance |
| One-screen emergency guidance | NRCS/NBD both warn against waiting on an app in an emergency | **Implemented** — emergency callout sits above the fold and repeats on search pages |
| Desktop → phone hand-off | RaktKhoj shows a QR/scan prompt | **Proposed** — a share/QR affordance on results and confirmation screens |
| "Not sure of group" as a real path | Competitors mostly force a group choice | **Implemented** — dedicated guidance route, never a guess |

## 2. Trust and honesty (highest-value gap in the market)

| Opportunity | Status |
| --- | --- |
| Show *when* inventory was updated, not just a number | **Implemented** — `updated_at`, "stale"/"unknown" states on bank cards and detail |
| Separate verification meanings (organisation vs. phone vs. inventory vs. demo) | **Implemented** — distinct badge tones/labels; demo pages carry `DemoBanner` + `noindex` |
| Never show a count below three donors (k-anonymity) | **Implemented** — donor results show "3+" rather than exact small numbers |
| Explain contact privacy in plain words where the action happens | **Implemented** — request/respond pages explain exchange-after-consent |
| Move disclaimers out of the footer into the flow | **Partly** — safety/emergency callouts in flows; full legal text stays on legal pages |

## 3. Donor usability

| Opportunity | Status |
| --- | --- |
| Availability as a single obvious toggle with 3 states | **Implemented** — available / unavailable / paused, current state visible |
| Separate per-channel consent, none preselected | **Implemented** — channel toggles with per-channel explanations |
| Respond without an account via capability link | **Implemented** — `/respond/[token]` |
| "Am I eligible?" style helper | **Proposed** — educational only; would need medical review, deliberately out of scope |

## 4. Organisation and administration

| Opportunity | Status |
| --- | --- |
| Inventory entry in one screen with confirmation of source | **Implemented** — inventory form requires a "reported, not estimated" confirmation |
| Freshness visible to the public, not only internally | **Implemented** — public bank page shows last-updated/stale |
| Verification queue with reviewer notes | **Implemented (demo)** — `/admin/demo` preview; real queue on `/admin` |
| Notification logs with truthful states | **Implemented (demo)** — synthetic states, labelled synthetic |

## 5. Mobile and accessibility opportunities

| Opportunity | Status |
| --- | --- |
| Critical actions never hidden on mobile | **Implemented** — sticky/first-position CTAs, drawer nav with Escape close |
| Touch targets ≥44px on primary controls | **Implemented** for buttons/inputs; **audit proposed** for inline text links |
| Reduced-motion support | **Implemented** — global `prefers-reduced-motion` rule in `globals.css` zeroes animation/transition durations and disables hover transforms |
| Nepali typography tuned (line-height for Devanagari) | **Proposed** — currently Noto Sans Devanagari in the stack; needs visual review in both languages |

## 6. Content and localization opportunities

| Opportunity | Status |
| --- | --- |
| Full Nepali coverage of nav, forms, errors, empty states, legal and safety copy | **Implemented** (dictionary coverage) with **professional review pending** |
| Consistent language per route (no mixed-language UI) | **Implemented** — all strings come from dictionaries; legal/medical review still required |

## 7. Deliberately not pursued

* Countdown timers, animated statistics, carousels — increase stress and load for no benefit.
* Fabricated "lives saved" counters — explicitly forbidden by the product's honesty rule.
* Gamified donor badges — implies verification we cannot substantiate.
