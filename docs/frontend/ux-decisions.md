# UX decisions

The decisions that shaped the interface, why they were taken, and what they rule out.
Use this to settle a design argument without re-litigating it.

## 1. Five fixed tabs, identical for every role

**Decision.** The bottom bar is `Home · Find · Request · Track · Profile`, fixed to the
viewport for the whole document, with the same five tabs for requesters and donors alike.

**Why.** Muscle memory is worth more than contextual cleverness in an emergency tool. A bar
that swaps its items when the role changes teaches the user nothing and silently moves the
target they were aiming at. It also means the bar can be one element with one test.

**Ruled out.** Role-specific tab sets, a "More" button in the bar, and putting secondary
pages in the bar at all. Secondary destinations live on **Profile** and in the header menu.

**Verified by.** `tests/e2e/mobile-app.spec.ts` — asserts `position: fixed`, viewport-bottom
alignment at the top *and* bottom of a deep scroll, exactly five links, and that the site
footer ends above the bar rather than behind it.

## 2. Contact happens outside the product

**Decision.** There is no in-app inbox. Contact is WhatsApp, Viber, telephone or SMS, with
honest per-channel status.

**Why.** An inbox implies delivery guarantees, moderation, retention and abuse handling
that a frontend cannot honour. Listing the channels people already have is both smaller
and more truthful.

**Ruled out.** Chat threads, unread counts, quick replies, typing indicators.

**Documented in.** [external-contact-links.md](external-contact-links.md).

## 3. Contact details are hidden until their owner reveals them

**Decision.** A number is never visible until the person it belongs to taps
*Show my number*, and either side can reverse that immediately.

**Why.** Donor privacy is a product requirement, not a setting. Default-open disclosure
would be the single most damaging thing this site could do.

## 4. The main panel asks for the requirement, then hands off once

**Decision.** The home page's emergency panel collects blood group, component, quantity,
urgency, hospital and location, then prefills `/request/new` rather than creating anything.

**Why.** The brief's core journey is *Find Blood → Select Location → Discover → Contact*.
Asking once and carrying the answers forward removes the worst friction in the flow, while
a review step keeps the user in control before anything exists.

**Ruled out.** Submitting straight from the home page, and re-asking the same questions in
the wizard.

**Implementation.** `src/components/blood-search/emergency-search.tsx` → validated query
params → `prefillFrom()` in `src/app/[locale]/request/new/page.tsx`. Every value is checked
against the same list the form itself uses, so a hand-edited URL cannot reach a state the UI
could not produce.

## 5. "Not sure" never guesses a blood group

**Decision.** Choosing *Not sure* routes to guidance instead of an empty result set.

**Why.** A confident wrong answer in this domain sends someone to the wrong hospital. The
guidance page states plainly that only a laboratory can determine a group.

## 6. Location is asked for, never assumed

**Decision.** The browser prompt follows an explicit tap only, and *Enter it myself* is
always equally prominent.

**Why.** A prompt on page load gets denied reflexively, and a denied prompt must never
become a dead end. See [location-tracking.md](location-tracking.md).

## 7. Simulated states are labelled where they appear

**Decision.** Each simulated or unconnected capability carries its label on the control
itself — a badge next to the channel, a note under the map, a banner on the demo route.

**Why.** A disclaimer in the footer is a claim nobody reads at the moment it matters. The
label belongs on the thing being described.

## 8. One heading per section

**Decision.** Sections carry distinct headings, so each landmark has a unique accessible
name.

**Why.** The home page previously rendered two sections both titled *How Rakta-Daan works*
with identical copy — a duplicated landmark and a duplicated reading. Navigation and screen
reader users both depend on names that disambiguate.

## 9. Small cards, one idea each

**Decision.** Dense, single-purpose cards with avatar initials, tag pills and one line of
meta, rather than long rows of prose.

**Why.** Matching the reference product's mobile density keeps a stressful screen scannable
at arm's length. Applied to `/app` home, the track overview, participants and invitations.

## 10. Improve in place; do not rebuild

**Decision.** New screens extend the existing design system; the working search, directory
and test suites were preserved throughout.

**Why.** The brief asks for an audit-then-improve pass, not a rewrite. Every change above
was made against a green baseline.
