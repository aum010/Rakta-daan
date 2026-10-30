# Location and live tracking

Location is the part of this product most likely to erode trust, so the frontend is built
around one rule: **ask, explain, offer an alternative, and never imply precision we do
not have.**

## Browser permission flow

Implemented by `LocationAssist` in
[`src/components/coordination/location.tsx`](../../src/components/coordination/location.tsx),
and surfaced on arrival by `EntryLocationCard`
([`entry-location.tsx`](../../src/components/coordination/entry-location.tsx)).

- On a **first visit** the choice is the first thing on the page — *Use device location* or
  *Enter it myself* — so nobody has to hunt for it. Once answered the card removes itself
  and the emergency panel takes over showing the resulting state, with a retry.
- The browser prompt itself is **never requested on page load**. It fires only after an
  explicit tap on **Use device location**.
- The competing option, **Enter it myself**, is always present and always works — declining
  location never blocks the flow, and every manual field stays available.
- The API is called with `enableHighAccuracy: false`, `timeout: 8000`,
  `maximumAge: 600000`, so a stale fix is preferred over a slow precise one.
- A granted fix is **reduced to the nearest district headquarters** using a haversine
  comparison against `src/data/geography.ts`, and the district-level result is what gets
  stored. No coordinate is persisted: `LocationChoice.lat` and `.lng` are written as `null`.

### Permission states

`locationPermission` in the coordination store is one of:

| State | Meaning | UI |
|---|---|---|
| `unknown` | Nothing asked yet | The consent card with both options |
| `granted` | Device fix accepted, reduced to a district | Success card, with a re-run button |
| `denied` | Browser or user refused | Explicit failure card, manual entry still offered |
| `dismissed` | User chose to enter it manually | Neutral card confirming the choice |

Denial is a first-class outcome, not an error to hide.

## Consent — four separate purposes

Consent is not a single global switch. `LocationConsent` in
[`src/lib/coordination/types.ts`](../../src/lib/coordination/types.ts) holds four
independently reversible purposes, managed at `/en/app/location`:

1. **Help me find nearby services** — requester discovery.
2. **Rank donors by distance** — donor matching.
3. **Share my location while travelling to the facility** — donor live sharing.
4. **Follow the donor's journey with consent** — requester live view.

Each toggle is off by default. The Profile tab summarises the current state as
*Shared for this request* or *Not shared*.

## What the map shows

The coordination map on `/en/app/track` renders **district-level positions only** and
carries that disclaimer on the map itself:

> District-level positions only. This prototype does not show live donor positions.

Distances shown next to candidates are district-to-district approximations, labelled as
such. There is no pan-to-donor, no blue dot, and no timestamped position feed.

## Trip map — donor ↔ receiver

[`TripMap`](../../src/components/coordination/trip-map.tsx) renders on `/en/app/track` →
**Overview** once a donor has committed, using the shape people already know from a
ride-hailing app: both ends pinned, a route between them, distance and ETA, so "is the donor
on the way?" is answerable in one glance.

What it honestly is:

- **Two consent purposes gate it** — `donor_live` for the donor's end and `requester_live`
  for the receiver's view. With neither granted it shows the consent prompt instead of a map.
- **Positions are district-level** (or the facility's own coordinates), the same projection
  as the coordination map.
- **The movement is labelled simulated**, and the distance comes from the fixture rather
  than a position feed. The ETA is phrased from an assumed 25 km/h city speed and never
  presented as a guarantee.
- **Stop sharing takes effect immediately** — the card disappears rather than degrading
  quietly.

Going live means swapping the simulated progression for a consented position stream per
participant; everything else on the card (ends, distance, ETA phrasing, disclaimer) stays.

## What is *not* implemented

Be precise about this in any demo:

- **No real tracking service.** `Participation.sharingLiveLocation` is an honest boolean
  describing intent; there is no position stream behind it, no geofence, and no server
  accepting updates.
- **No background or continuous tracking.** The device fix is taken once per explicit tap.
- **No movement simulation presented as real.** Where the interface needs to show a state
  that only a backend could produce, it is labelled as demonstration data.
- **No cross-device sharing.** All state is browser-local.

## Going live — integration requirements

To replace the simulated layer with real tracking, the frontend boundary expects:

1. A location service that accepts a position update per consented participant, scoped to
   the request they joined.
2. Server-side persistence of coordinates with a retention limit, and a district-level
   projection for anything that leaves the server.
3. The four consent purposes enforced server-side, not just in the UI — a UI toggle is not
   a permission check.
4. An explicit end-point for **Stop sharing**, which must take effect immediately rather
   than at the next poll.
5. The map layer swapped for a real tile provider, keeping the honest disclaimer logic
   tied to whether real positions are actually flowing.

Until those exist, the correct statement is the one the UI already makes: this is a
consent and coordination prototype, not a live location service.

## Privacy rules to preserve

- Never store a precise coordinate in this frontend.
- Never publish a donor's location below district granularity.
- Never default a consent toggle to on.
- Always offer a manual alternative to the browser prompt.
- Always label district-level data as district-level.
