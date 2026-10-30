# Localization (English / Nepali)

## 1. System

| Piece | How it works |
| --- | --- |
| Routing | `/[locale]/{…}` with `en` (default) and `ne`; invalid locales 404 |
| Dictionaries | `src/messages/en.ts`, `src/messages/ne.ts` — flat, typed `Dictionary` |
| Lookup | `getDictionary(locale)` in `src/lib/i18n.ts`; `format(template, params)` for interpolation |
| `<html lang>` | `htmlLang(locale)` → `en` / **`ne-NP`** (BCP 47), set in `src/app/[locale]/layout.tsx` |
| Switching | `LanguageSwitcher` rewrites the current path only — route, query and anchor are preserved |
| Formatting | Dates/times via `src/lib/dates.ts` (Nepal-local display), numbers and units from dictionaries |

## 2. Coverage

Every user-visible string comes from the dictionaries: navigation, hero and CTAs, search
labels, blood-group/component/urgency labels, request and donor forms, validation and error
messages, empty states, status labels, dashboards, legal/consent/privacy copy, safety and
emergency guidance, FAQ/learn content, footer, accessibility statement.

Line-count parity: `en.ts` ≈ 1105 keyed lines, `ne.ts` ≈ 1106 — the dictionaries are kept in
lockstep (a missing key is a TypeScript error because `ne` is typed as `Dictionary`).

Rules:

1. No literal user-facing English inside components — if a string needs translating it goes
   in both dictionaries first.
2. Nepali strings must be complete sentences in a consistent register; avoid mixed-language
   UI except for established loanwords (SMS, blood group codes like A+).
3. Blood groups are shown with `bloodGroupLabel(group, locale)` — symbols universally, words
   localized.
4. Legal and medical text is **translated, not legally validated**: professional review is a
   launch item (see the final report).

## 3. Known localization risks

| Risk | Mitigation |
| --- | --- |
| Devanagari line-height/word-break differs from Latin | Same type stack includes Noto Sans Devanagari; visual review still pending |
| Longer Nepali labels overflow compact controls | Controls use flexible widths; tested at 390px viewport |
| Numbers/dates diverging between locales | Single date formatter; BS conversion not implemented (documented limitation) |
| Mixed-language copy creeping in | Lint/code review + i18n unit tests asserting dictionary parity and placeholder counts |

## 4. Adding a string

1. Add the key to `src/messages/en.ts`.
2. Add the Nepali translation to `src/messages/ne.ts` (type errors otherwise).
3. Use `dict.group.key` (or `format(dict.x.y, { name })` for interpolation).
4. Add/extend an assertion in `tests/unit/i18n.test.ts`.
