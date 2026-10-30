# Frontend limitations

What this repository is **not**, stated plainly so nothing here is oversold. Every row
below is either visible in the UI with a label, or documented as an integration boundary.

## Data

| Area | Status |
|---|---|
| Donors, facilities, camps, requests in `/app` | Browser-local fixtures in `src/mocks/fixtures.ts` and `src/lib/coordination/`. Nothing is sent anywhere. |
| Blood stock figures | Self-reported, with freshness labels. A stale figure is marked stale rather than presented as live. |
| Donor counts | Aggregated and k-anonymised — never shown below three as an exact number, never with names. |
| Donor eligibility | Display status derived from recorded facts. A UI tap never becomes a medical claim. |
| Reset behaviour | "Reset demo data" clears the request, contact consent and history held in this browser only. |

The public site additionally has a real PostgreSQL-backed layer (search, OTP login,
requester dashboard, org inventory, admin). That layer is **not** part of this
frontend-only pass and is not modified by it.

## Integrations that are not connected

| Integration | Current state |
|---|---|
| SMS / WhatsApp / Viber delivery | `MESSAGING_PROVIDER=mock` — reported as `simulated`, never `delivered`. See [external-contact-links.md](external-contact-links.md). |
| Placing a call | Simulated preview. No call is dialled. |
| In-app messaging | Not built, by requirement. No route, no composer. |
| Live location tracking | Consent and intent only — no position stream. See [location-tracking.md](location-tracking.md). |
| Email | The contact form validates and then states that nothing was sent. |
| Map tiles / geocoding | Static district geometry; no tile provider, no routing. |
| Sign-in on the mobile prototype | Not required for search; the `/app` prototype uses browser-local state. |

## Not production-ready

- **Demo routes are `noindex`** and every one of them renders a `DemoBanner`.
- **Fixture phone numbers** use a reserved fictional range and are labelled as such.
- **No server-side authorisation** exists for the coordination prototype — the domain rules
  are unit-tested and enforced in the client, which is not a security boundary.
- **No rate limiting, abuse handling or retention** on browser-local state.
- **No push notifications.** The notification-preview card shows the exact message a donor
  would receive; it sends nothing.
- **OTP-before-sending** is not faked in the browser prototype. It exists in the platform
  phase, not here.

## Scope boundaries honoured

- The backend and database schema were not rebuilt or replaced by this pass.
- No new framework or state library was introduced.
- No native application was built; this is a website.
- The existing design system was extended, not discarded.

## How to check these claims

```bash
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint .
pnpm test        # unit + integration (needs the local Postgres on :5435)
pnpm test:e2e    # Playwright, including axe audits
pnpm build       # production build
```

Current recorded results live in [testing.md](testing.md).
