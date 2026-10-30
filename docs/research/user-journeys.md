# User journeys

Each journey lists the happy path, the honest failure paths, and the page/API that implements
it. "Demo" marks the browser-local, clearly-labelled flows that need no account.

## J1 — Requester creates a real request

1. `/[locale]/find` → choose group + district + radius → results (banks with distance,
   verification, freshness; donor **count** only, never identities).
2. **Start a blood request** → `/login?next=…` → phone OTP → back to
   `/dashboard/requests/new`.
3. Form: group needed, component, units, urgency, province/district, hospital, needed-by,
   contact name/phone, notify radius, consents (accuracy, sharing, updates).
4. `POST /api/v1/requests` → 201 with `publicId`, `notified.notified`, `notified.simulated`
   (honest: simulated when no provider configured).
5. `/dashboard/requests/[publicId]` shows status, response list (only donors who responded),
   share link, notify-more, close.
6. Public share link `/requests/[publicId]` — readable by anyone, shows no phone unless
   `share_contact_publicly` and still open; abuse-report link present.
7. Close request → `closed_at` set → retention scrubs contact details after 7 days.

**Failure paths:** invalid input (400 + field errors), unauthenticated (redirect to login),
rate-limited (429), cross-origin (403), duplicate open request for same details (suppressed),
no matching donors (201 with `notified: 0` and UI explains "no donors matched — call these
banks").

## J2 — Donor receives and answers a request

1. Registration `/register` (or `/donor` console): group, sex, location, availability window,
   channels, consent toggles → `POST /api/v1/donors`.
2. Matching selects donor → outbox row `queued` with `dedupe_key` → cron dispatches through
   the configured adapter (or `simulated` in development).
3. Donor taps `/respond/[token]` (capability link, single-use) → **Interested** or
   **Unavailable**, optional note → `POST /api/v1/responses/[token]`.
4. Only now is donor contact visible — to the requester, on their dashboard.
5. Requester calls the donor; marks request fulfilled.

**Failure paths:** token invalid/used (error state with next steps), donor opted out
(suppressed — never contacted), cooldown not met (excluded from matching), stale profile
(excluded), provider failure (message stays `failed` with `last_error`, retry via cron).

## J3 — Blood bank publishes inventory

1. `/login` with a member phone → `/org` → choose organisation → inventory grid by
   group × component.
2. `PUT /api/v1/orgs/[slug]/inventory` → ownership check (403 for outsiders) → row updated
   with `updated_at`, `source`, `reported_by` → audit event.
3. Public `/banks/[slug]` shows units with freshness (or "unknown"/"stale" when applicable).

## J4 — Administrator verifies an organisation / triages abuse

1. `/login` (admin role) → `/admin`.
2. Pending organisations → **Verify** with note → `POST /api/v1/admin/orgs/[id]/verification`
   (403 for non-admins — smoke-tested) → audit event → org badge changes to "verified
   (organisation)" with timestamp.
3. Abuse reports queue → open → resolve/dismiss with reason → `POST /api/v1/admin/abuse/[id]`.
4. Camps manager → create/edit camp (`POST /api/v1/admin/camps`).

## J5 — "Not sure of the blood group"

`/find?group=not_sure` → redirects to `/find/guidance` → plain-language compatibility
explainer → links to call the nearest blood bank or start a request. No compatibility is
guessed anywhere.

## J6 — Donor stops messages

Inbound `STOP` → `POST /api/webhooks/sms` (bearer-authenticated) → `opt_outs` row → every
later send re-checks and suppresses. Donor can also toggle channels in `/donor`.

## J7 — First-time visitor, zero account

Home → find → banks/camps/learn pages → either starts a real request (login) or exercises the
**labelled demo** wizard (`/request/new`, `noindex`, banner "demo — data stays in this
browser") to see the flow without creating data in production tables.

## Journey coverage map

| Journey | UI | API | Tests |
| --- | --- | --- | --- |
| J1 | find, login, dashboard | `/auth/*`, `/requests`, `/requests/[id]/*` | integration `requests`, smoke |
| J2 | register, donor console, respond page | `/donors`, `/responses/[token]`, outbox | integration `outbox`, smoke |
| J3 | org console, bank page | `/orgs/[slug]/inventory` | smoke (incl. 403) |
| J4 | admin console | `/admin/*` | smoke (incl. 403) |
| J5 | find + guidance | — | unit (blood), e2e spec |
| J6 | donor channels UI | `/webhooks/sms` | smoke (401), outbox tests |
| J7 | demo pages | — | demo unit tests, e2e specs |
