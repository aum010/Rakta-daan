# Frontend competitive analysis

Scope: **public interface and user-journey research** for the Rakta-Daan frontend. Pages were
fetched and read on 27 October 2026 (and earlier in the same research cycle); where a page
could not be inspected, that is stated.

**Classification key**

* **[observed]** — visible in a page/interface we actually fetched.
* **[official]** — stated in official documentation or a statutory source.
* **[claimed]** — the platform or a store listing says it; not independently verified.
* **[not verified]** — could not be inspected; do not rely on it.

Nothing here reflects access to any platform's source code, backend or internal data.

---

## 1. RaktKhoj — https://raktkhoj.org/ **[observed, fetched 27 Oct 2026]**

Interface actually read; notable because it contradicts our earlier research cycle, where no
Nepal-facing RaktKhoj could be found.

* **Homepage hierarchy:** headline "Need blood right now? Find donors near you, in minutes" →
  QR "Scan with your phone to continue" → "Browse the Blood Bank Directory instead" →
  registration CTA → camps strip → "How RaktKhoj works" (3 steps) → eligibility quiz → blog →
  footer disclaimer.
* **CTAs:** *Find blood in minutes*, *Register as Donor*, *Organisation login/registration*.
* **Search pattern:** one-screen "group + location (GPS or state/district)"; explicitly falls
  back from live bank stock to nearby registered donors so users never hit a dead end.
* **Trust indicators:** organiser listings, camps with dates/venues, blog/milestone content.
* **Honesty (important):** the site states *"RaktKhoj is a demo site and should not be used
  for real emergencies"* and *"an independent prototype/demo project, not affiliated with …
  the Government of India"*. Stats counters are visibly zeroed in the static HTML.
* **Market:** India-focused (states/UTs, eRaktKosh), **not** Nepal.
* **Frontend take-aways:** the "never a dead end" fallback search, the prominent demo/not-for-
  emergencies disclaimer, and QR-based hand-off from desktop to phone are strong patterns.

## 2. Nepal Voluntary Blood Donors' Society — https://nvbds.org.np/ (+ nbds.org.np/donors) **[observed]**

* Donor directory searchable by blood type, location and availability; donor cards show
  location, donation count and contact buttons.
* Blood-bank directory advertises "verified blood banks and their current availability" — no
  freshness timestamp is shown on the fetched page **[observed]**; the verification method is
  not explained **[claimed]**.
* Privacy policy publishes a good rule: phone/email are not public and a phone is revealed
  after a donor responds — a strong, clearly-worded trust statement.
* **Frontend take-aways:** a clean filter rail + card grid; weakness: "verified"/"current"
  labels without dates make freshness unscannable.

## 3. Hamro Rakta Sanjal — https://hamroraktasanjal.com/ **[observed]**

* Search requires blood group + province + district + local level (ward optional); empty
  location options are hidden.
* Donor profiles appear only when the donor is marked available inside their availability
  window — good honest model of "available right now".
* FAQ states OTP verifies a mobile number only, and that final eligibility is decided by an
  authorised hospital/blood bank; a dedicated medical-disclaimer page exists.
* Donor contact details are visible to matching users **[observed]**.
* **Frontend take-aways:** explicit availability windows; weakness: contact exposure model
  and a documentation-style visual language.

## 4. Hamro Blood Bank — https://actnepal.org/projects/hamro-blood-bank/ **[observed project page]**

* The ACT Nepal page is a project description rather than a product interface, so the live
  UI could not be inspected there **[not verified]**.
* The separate hamroblood.com privacy policy describes organisation portals entering
  inventory; its Google Play listing claims "No data collected / Data isn't encrypted" while
  the policy says data is collected and protected — a disclosure conflict **[observed]**.
* **Frontend take-aways:** organisation-side inventory entry is a real workflow worth
  designing for; disclosure consistency is a trust requirement.

## 5. Nepali Blood Donors — https://nepaliblooddonors.com/ **[observed/claimed]**

* Android app + website: find donors by group/location, create and share emergency requests,
  blood-bank/hospital/ambulance discovery **[claimed from store listing]**; the fetched site
  exposed limited text **[partly not verified]**.
* Terms are a good honesty model: the platform does not verify identity, health or real-time
  availability; compatibility content is educational and needs hospital cross-match; "do not
  wait for an in-app match in a life-threatening emergency".
* **Frontend take-aways:** an in-app shareable request is a useful pattern; the terms'
  disclaimers are worth mirroring in plain UI copy rather than hiding in legal pages.

## 6. BloodBankNepal — https://bloodbanknepal.org/ **[not verified]**

* The fetched page exposed only a title and "Connect with blood donors near you". Search
  fields, results and registration could not be inspected. No design conclusions drawn.

## 7. Nepal Red Cross Society — https://nrcs.org/ **[observed/official]**

* Institutional site: donate-blood page directs donors to camps and lists the 24/7 Central
  Blood Bank (Soalteemod), regional centres and district banks with focal persons and phone
  numbers.
* No public donor search, no online request workflow and no live component-level stock on the
  reviewed page **[observed]**.
* **Frontend take-aways:** authoritative contact/centre directory is the baseline expectation
  in Nepal; phone-first action must always be one tap.

## 8. e-RaktKosh — https://eraktkosh.mohfw.gov.in/ **[official product description]**

* C-DAC describes national blood-stock display, blood-bank management, camps, donor
  registration, online requests and dashboards. The live portal timed out during research, so
  current screen-level design was **not verified**.
* **Frontend take-aways:** stock-by-location/blood-group tables with an explicit source and
  update time are the reference pattern for inventory presentation.

## 9. Friends2Support — https://www.friends2support.org/ **[claimed]**

* Store listings describe location-based donor search, OTP registration, call/message donors,
  sharing and reporting bad data. The website's search screens did not render in our fetch
  **[not verified]**.
* **Frontend take-aways:** "call or message directly from the result card" is the interaction
  users expect; privacy model differs from ours (we exchange contact only after a response).

---

## 10. Comparative matrix (interface level)

| Platform | Search UX | Results presentation | Trust labelling | Freshness shown | Contact model | Mobile |
| --- | --- | --- |---|---|---|---|
| RaktKhoj | One-screen group+location, QR hand-off | Bank stock → donor fallback | Demo disclaimer, org labels | Live-stock claim **[claimed]** | App-flow | Mobile-first |
| NVBDS | Filter rail + cards | Donor + bank cards | "Verified" without method | No timestamps observed | Contact buttons public | Responsive |
| Hamro Rakta Sanjal | Group+province+district+local level | Donor list with availability window | OTP = number only, disclaimers | Availability window shown | Visible to matchers | Responsive |
| NBD | App-led | Request share + directory | Verification tick (unverified) | Not observed | In-app | Android app |
| NRCS | Directory/browsing | Centre list with phone numbers | Institutional | None | Public phone | Basic |
| e-RaktKosh | Stock tables | Inventory by centre | Government | Source/time **[not verified screen-level]** | Institutional | App listed |
| **Rakta-Daan (ours)** | Group + district + radius, first-class "Not sure" | Banks with distance/verification/freshness + donor **count** | Separated labels (organisation verified vs. inventory freshness vs. demo) | `updated_at`, "unknown"/"stale" | Consent exchange after response | Mobile-first, low-bandwidth SSR |

## 11. What we deliberately did **not** copy

Brand colours and wordmarks, layouts, illustration styles, copy, proprietary badges, or any
asset. Inspiration was limited to interaction ideas listed above; Rakta-Daan's visual system
is defined in [design-system.md](design-system.md).
