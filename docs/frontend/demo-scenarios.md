# Demo scenarios and how to demonstrate the flows

Everything below runs in the browser with no backend. Start it with `pnpm dev` and use a
phone-sized viewport (390 × 844) so the persistent bottom tab bar behaves as it will for a
real user.

## Loading a scenario

`/en/app/profile` → **Demo scenarios** (also reachable from the header menu).

| Scenario | What it demonstrates |
|---|---|
| **Emergency — three units** | An open request with committed donors and a notification wave in progress. The default starting point for any demo. |
| **Uncertain eligibility** | Candidates whose eligibility has not been reviewed, shown honestly as *unknown* rather than guessed. |
| **Location denied** | Device location unavailable, so the area is entered manually — proves the flow never depends on the browser prompt. |
| **Reset demo data** | Clears the request, contact consent and history held in this browser, with a confirmation step. |

Every load and reset reports its result in a `role="status"` message.

## Flow 1 — requester finds help (the core journey)

1. `/en` → the **emergency panel**: blood group, component, units, urgency, hospital and
   location. Location offers *Use device location* and *Enter it myself*; neither blocks
   the other.
2. **Find Blood** → `/en/request/new`, with every value already filled in. The requester
   never types the same detail twice.
3. Walk the four steps — need → location → contact → review — and submit to get a shareable
   reference.
4. `/en/app/scenarios` → load **Emergency — three units**, then `/en/app/track`:
   - **Overview** — `0 / 3 committed`, "Searching for donors".
   - **Map** — district-level disclaimer is visible on the map itself.
   - **Donors** — notification waves, participants, nearby candidates.
   - **Contact** — external channels only.
   - **Activity** — timeline of what happened, when.
5. `/en/app/donor` → **Accept invitation**, then back to Track: coverage recalculates to
   `1 / 3 committed` because the domain machine recomputed it, not the UI.

## Flow 2 — donor receives and answers a request

1. `/en/app/donor` → the invitation cards, each with group, distance, wave and state.
2. **Accept invitation** → status flips Invited → Accepted and the action row becomes
   Track / Contact / Withdraw.
3. **Contact** (inline on the invitation) → contact stays hidden until the person sharing
   it taps **Show my number**; **Keep it hidden** reverses it immediately.
4. The notification-preview card shows the exact message a donor would receive, with real
   Accept / Decline controls wired to the same domain transitions. It is labelled
   *simulated preview — no message is sent from this browser*.

## Flow 3 — find and call a facility (no account required)

1. `/en` → **Quick actions → Find a Blood Bank** (`/en/find`).
2. Choose a blood group and district. Choosing **Not sure** routes to guidance instead of
   guessing a group.
3. Results show banks with verification, distance, reported units, freshness and a stale
   badge where applicable, plus k-anonymised donor availability.
4. Open a facility detail page and use the `tel:` link to call before travelling.

## Flow 4 — consent and privacy

1. `/en/app/location` → four independent, individually reversible consent purposes.
2. `/en/app/profile` → the current state reads *Shared for this request* or *Not shared*.
3. Load **Location denied** to show the manual path without any browser prompt.

## Things a demo must not claim

- That a message, call or SMS was delivered.
- That donor positions are live.
- That a fixture hospital, stock figure or donor is real.
- That eligibility shown in the UI is a medical clearance.

Each of these is contradicted by an explicit label somewhere on the screen.
