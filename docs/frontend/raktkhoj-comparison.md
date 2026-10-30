# RaktKhoj comparison — flow, notifications, acceptance and tracking

Study of **41 captured RaktKhoj mobile screens** (raktkhoj.org, shared by the reviewer)
against Rakta-Daan's mobile-first coordination flow. Purpose: verify whether our process
steps match theirs — especially **donor notification in the donor's messaging app, one-tap
acceptance, and the tracking screen** — and extract the compact-card mobile UI language.

RaktKhoj is itself a labelled demo ("a demo site and should not be used for real
emergencies", "Build What Moves India hackathon"), so it is used here as a UX reference,
not as a production-correctness benchmark.

## 1. RaktKhoj's observed flow (from the screenshots)

| # | Screen | What it does |
|---|---|---|
| 1 | Homepage hero | "Need blood right now?" → **Find Blood Now**; 2-col feature cards (Become a Donor, Find Blood Camps), 3 small stat cards (56 L / 4.7 K / 2.7 L) |
| 2 | Wizard **Step 1 of 5** | Blood group as an 8-tile grid of small cards (`O+ … AB-`) with **Common/Rare** captions, selected tile turns red; "Not sure which group?"; sticky **Continue** |
| 3 | **Step 2 of 5** | "Share patient's location — nothing is stored or shared": state/district dropdowns; the browser's *precise vs approximate* location permission is requested here |
| 4 | **Step 3 of 5** | Patient details (name, age, gender, units) — "A detailed request is far more likely to invite a donor" |
| 5 | **Step 4/5** | Confirm hospital: search field + result cards with distance (`· 0.0 km`), red highlight for selection |
| 6 | Bank search | Radar loading ("Searching blood banks near you…"), map with droplet pins + legend (Best match / Has stock / No stock), **25/50/100 km pills**, result summary "Showing 58 Bank(s) · B+ & Compatible", compact cards: title, distance, tag pills (`Govt.`, `8 units`, `B+, B- +2`), row of share / location / **Call** |
| 7 | Bank empty state | "No confirmed AB+ or compatible Whole Blood within 50 km → Try a wider radius, or search donors near you" + fallback CTA **Search Donors Near You** (no dead end) |
| 8 | Donor search | Radar ("Searching registered B+ & compatible donors…") → **"We found 3 donors"** with stacked avatars → **"Verify your number to send requests to donors"** (10-digit mobile + OTP) |
| 9 | Compose | "Message request to donor": prefilled request text + optional "What happened?" field, reason chips (Accident, Disease, Critical, Surgery, Childbirth) → **Send to 14 donors** |
| 10 | Dispatch | "Sending… **Notifying 14 donor(s) near you…**" |
| 11 | **WhatsApp notification** | A **WhatsApp Business** conversation from the verified number: "🩸 Blood request near you / Blood group needed: AB+ (also compatible…) / Units required: 7 / Can you help?" with one-tap **✅ Accept** and **❌ Ignore** buttons |
| 12 | **Post-accept screening** | After Accept, the bot immediately asks in the same chat: **"Have you donated blood in the last 3 months?" → Yes / No** |
| 13 | **Tracking** | "Request sent": map with a **"1 of 3 accepted"** pill, section "Donors who've accepted" with a **2/3** counter, one small card per donor (avatar + verified check, name + group pill, `0.6 km away · Male, 30`, share / **Call** / **WhatsApp** buttons), footer state **"Waiting for more, please be patient"** |
| 14 | Accounts | Donors: **phone + OTP** ("we only use your number to reach you when someone nearby needs your blood group"). Organisations: **separate email-code login** ("One login for your whole team") |

## 2. Where Rakta-Daan already matches

| RaktKhoj step | Rakta-Daan equivalent |
|---|---|
| Mobile-first, step-by-step request wizard with progress + sticky CTA | `/request/new` demo wizard (4 steps, review + consent) and `/app` journey |
| Blood-group tiles with "Not sure" escape | `BloodGroupPicker` + `/find` "Not sure" guidance (e2e covered) |
| Radius pills, map + list, honest empty state with donor fallback | find results + `/app/track` Map tab (district-level disclaimer), no-results recovery |
| Donor acceptance counting toward a requirement | domain machine: invite → accept → arrive → donate → confirm; "1 of 3 accepted" ≈ **"1 / 3 committed"** (coverage recomputed by the domain, e2e asserted) |
| "Waiting for more, please be patient" | wave countdown (`WavePanel`, "min to respond", escalation) |
| Contact only after acceptance (Call / WhatsApp) | conversation opens **only for committed participants**; contact hidden until consent (`requestDisclosure`, e2e asserted) |
| Phone-OTP identity for donors | platform phase has real OTP login (mock delivery); prototype labels everything simulated |
| Demo honesty banner | `DemoBanner` + `noindex` on every demo surface |
| Separate org account | org console/preview vs donor area already separated |

## 3. Where our process differs — and what we do about it

| # | RaktKhoj | Rakta-Daan today | Decision |
|---|---|---|---|
| D1 | Request is delivered **inside the donor's WhatsApp** (business account tied to their verified number) with **Accept/Ignore buttons** | Wave invitations appear **in the donor dashboard**; delivery is *simulated* (this phase forbids real messaging) | **Add a notification-preview card**: a WhatsApp-style message mock ("🩸 Blood request near you… Can you help?") inside the donor invitation, with real **Accept / Decline** action buttons wired to the same domain transitions, labelled *Simulated — nothing is sent*. This shows the exact message a donor would receive and lets the reviewer accept "the notification" like in RaktKhoj. |
| D2 | After Accept, the bot screens in chat ("donated in the last 3 months? Yes/No") | Eligibility is a **display status** derived from recorded facts (90-day cooldown, assessment, deferral) shown on the donor dashboard | Keep: we do not run a chat questionnaire, because a UI answer must not become a medical claim. The same 90-day rule exists in `eligibility.ts` and gates candidate ranking. Documented as intentional. |
| D3 | Requester must verify phone by OTP **before** sending to donors | The `/app` prototype is browser-local and does not authenticate | Honest prototype difference; real OTP exists in the platform phase. Not faked. |
| D4 | Orgs notified through their own login (email code) | Facility preview shows incoming requests in `/app/roles` | Matches in spirit; labelled preview-only. |
| D5 | Tracking shows one compact card per accepting donor with Call/WhatsApp + accepted-count pill | `/app/track` Donors tab lists participants (group, distance, wave, state) + map on a separate tab | **UI work**: compact cards with avatar, pills and inline actions (below). No real Call/WhatsApp — buttons are labelled simulated. |

## 4. Mobile UI language to adopt (the "small cards" instruction)

From the screenshots, RaktKhoj's mobile density comes from five repeating patterns:

1. **Small square tiles in 2–4 column grids** (blood-group tiles, stat cards, feature cards).
2. **Tag pills on every card** — `Govt.` · `8 units` · `B+, B- +2`, or our equivalents (group, urgency, distance, wave).
3. **One-line meta** under the title (`Arwal, 0.0 km` / `0.6 km away · Male, 30`).
4. **Compact action rows** inside the card (share / location / Call as equal small buttons).
5. **Counters as pills** (`2/3`, `1 of 3 accepted`) rather than large stat blocks.

Applied to our screens in this pass: `/app` home (2-col quick-action tiles + compact
active-request card with pill row), `/app/track` overview (3-across mini stats on mobile,
pill-row coverage), participants list (avatar + pill row + compact actions), donor
invitations (notification-preview card with pill meta + Accept/Decline action row).

## 5. Browser verification (390×844, emergency scenario)

Exercised in the running preview rather than assumed:

| Step | Result |
|---|---|
| Donor receives the notification | `/app/donor` shows the NOTIFICATION PREVIEW card, badge **Invited**, copy `🩸 Blood request near you / 3 units for Demo Teaching Hospital · O+ / Can you help?` — the RaktKhoj D1 format |
| One-tap acceptance | **Accept** fires `acceptInvitation`; badge flips to **Accepted** and the action row becomes Track this request / Contact / Withdraw. Coverage is recomputed by the domain machine, not the UI |
| Tracking after acceptance | `/app/track` Donors tab lists one compact card per participant (avatar initial, group pill, `3.2 km away (district estimate) · Wave 1 · 1 unit committed`, state pill); Overview shows the 3-across mini stats and `1 / 3 committed` |
| Reset path | Reset demo data is a **two-step** confirm; after it, `/app/donor` correctly reports *No invitations* rather than a stale state |
| Nepali parity | `/ne/app/donor` renders the same card in Nepali (`आमन्त्रणहरू`, `सूचनाको पूर्वावलोकन`) with matching placeholders |

Defects found and fixed while checking these screens:

* **Singular/plural** — the compact cards read `1 donors`, `1 unit(s) committed`, `Still short of 1 unit(s)`. Added `…One` variants to ten keys (`participants`, `committedUnits`, `invitedTo`, `needMore`, `confirmOver`, `unitsNeeded`, `responsesCount`, `notifyMoreResult`, `donor_accepted_units`, `facility_confirmation`) and wired each call site to pick on `count === 1`. English gets real singulars; Nepali keeps `{count}` because it does not inflect here, mirroring the existing `banksCountOne` precedent, so digits stay one script down a whole screen.
* **`responsesCount` in the dashboard** was built with a raw `.replace("{count}", …)`; switched to the shared `format()` helper.
* **`timelineLabel`** counted on the raw string (`detail === "1"`), which broke when the event carried no detail. It now parses the count and defaults to one.
* Dropped a `recalculatedOne` key that turned out to be unreferenced — no dead entries added.

## 6. Constraints that remain (by phase rules)

* No real message or call delivery — every notification surface says **simulated**.
* No claim of real-time donor tracking — the map keeps its district-level disclaimer.
* Frontend only: no backend, no database, no provider credentials in this phase.
