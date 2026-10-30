# Competitive analysis

Research performed against public websites, app-store listings, official regulator/statutory
sources and vendor documentation. **Classification key** (required by the brief):

* **[official]** — stated in an official government/regulator/platform document we fetched.
* **[observed]** — visible on a publicly accessible interface we fetched.
* **[claimed]** — the platform says it, we could not independently verify it.
* **[unverified]** — could not be confirmed; do not rely on it.
* **[recommendation]** / **[assumption]** — our inference, not a fact about a competitor.

> No competitor's source code, branding or proprietary design was inspected or copied.
> A "verified" badge anywhere is not evidence of clinical eligibility, current availability
> or stock accuracy.

## 1. Landscape summary

| Platform | Model | Contact exposure | Standout | Weakness Rakta-Daan addresses |
| --- | --- | --- | --- | --- |
| Hamro Rakta Sanjal **[observed]** | Donor finder, OTP registration, availability windows | Matching users can see donor contact details (per FAQ) | Clearest documented donor workflow: OTP, profile, availability, deletion | Contact is visible to matching users rather than exchanged by consent |
| Hamro Blood Bank **[observed/claimed]** | Request posting + org portals | Org-level inventory claimed in policy | Digitisation/inventory angle | Play listing says "no data collected / not encrypted" while the privacy policy says the opposite — disclosure conflict **[observed]** |
| Nepal Voluntary Blood Donors' Society (NVBDS) **[observed/claimed]** | Donor + blood-bank directories with "verified" labels | Policy: phone withheld until a donor responds | Publishes a privacy policy with a consent-based reveal rule | Directory records authenticity not verifiable; "verified" method undefined |
| Nepali Blood Donors (NBD) **[observed/claimed]** | App + site, community matching | Terms: no verification of identity/health/availability | Clear disclaimers in terms | Store disclosure says "no data collected" while its privacy page describes retained data |
| BloodBankNepal **[unverified]** | "Connect with blood donors near you" | Not verifiable from fetched page | — | Public page too thin to assess |
| Nepal Red Cross Society **[observed/official]** | Service directory: centres, focal persons, phone numbers; 24/7 Soalteemod service inside the valley | Public phone numbers for centres | Authoritative institutional route | No online donor search/request workflow observed on that page |
| e-RaktKosh (India) **[official]** | National blood-bank management: stock, requests, camps, donor DB, dashboards, APIs (C-DAC) | N/A (institutional) | Inventory digitisation at national scale | Government programme; design reference only |
| Friends2Support (India) **[claimed]** | Voluntary donor search by location + group; OTP registration; call/message donors | Contact via app flows | Large donor database, store-listed 1M+ downloads **[claimed]** | Store disclosures differ between Android/iOS |
| RaktKhoj | — | — | **[unverified]**: no verifiable Nepal product found under this name in this research | Do not treat as a confirmed competitor without a URL |

## 2. Detailed findings

### Hamro Rakta Sanjal
* **Search flow [observed]:** blood group + province + district + local level; ward optional;
  empty locations hidden; donors must be marked available and inside their window to appear.
* **Registration fields [observed]:** name, Bikram Sambat date of birth, verified mobile,
  blood group, gender, province, district, local level, daily availability; email/alt
  phone/ward optional.
* **Verification [observed]:** OTP verifies *a Nepali mobile number* only; the FAQ states the
  platform does not verify identity, blood group or eligibility and that final eligibility is
  decided by an authorised hospital/blood bank.
* **Disclaimers [observed]:** medical disclaimer page states no guarantee of compatibility or
  response and that it is not an emergency dispatch service.
* **Privacy [observed]:** public matching profiles may reveal name, phone, blood group,
  gender, local level and availability; donors can delete their public details.
* Sources: https://hamroraktasanjal.com/ , /frequently-asked-questions/ , /medical-disclaimer/ , /privacy-policy/ , /terms-of-use/

### Hamro Blood Bank
* **Request journey [observed]:** create a blood need, set urgency, connect with compatible
  donors around a location (exact form fields not verifiable publicly).
* **Org inventory [claimed]:** privacy policy describes organisation portals entering
  inventory; live public stock not established.
* **Disclosure conflict [observed]:** Google Play says "No data collected" and "Data isn't
  encrypted"; the site's privacy policy lists name, phone, DOB, location, blood group,
  donation history and inventory data with HTTPS and RBAC.
* Sources: https://hamroblood.com/ , /privacy-policy , Play listing `com.hamrobloodbank`

### NVBDS
* **Directories [observed]:** donor directory searchable by blood type/location with
  donation counts and contact buttons; blood-bank directory claims "verified blood banks and
  current availability" — method and freshness not verifiable.
* **Privacy [observed]:** policy says name/blood group/area/donation count may be public,
  phone and email are not, and phone is revealed after a donor responds to a request —
  the closest published model to ours.
* **Terms [observed]:** information service only; not a collection/testing/storage/supply
  service; false emergency requests prohibited.
* Sources: https://nvbds.org.np/ , https://nbds.org.np/donors , /privacy-policy-nvbds-blood/ , /terms-conditions/

### Nepal Red Cross Society
* **[observed/official]** Donate-blood page directs donors to camps/events, lists the 24/7
  Central Blood Bank (Soalteemod) for the valley and regional centres/district banks
  elsewhere, with focal persons and phone numbers. No public donor search or online request
  workflow observed. Live component-level inventory not observed.
* Source: https://nrcs.org/get-involved/donate-blood/

### e-RaktKosh (India) — design reference
* **[official]** C-DAC describes a national platform for blood-centre information and
  blood-bank management with stock updates from 2,800+ blood banks, donor registration,
  online requests, camps, dashboards, MIS and open APIs; a mobile app is listed.
* Freshness/accuracy at individual centres: **not verified**.
* Sources: https://www.cdac.in/index.aspx?id=product_details&productId=e-RaktKosh , https://eraktkosh.mohfw.gov.in/

### Friends2Support (India) — design reference
* **[claimed]** Store listings: location-based donor search, OTP registration, call/message
  donors, share, report incorrect data; Android lists 1M+ downloads while Apple says the
  developer provided no privacy details.
* Sources: https://www.friends2support.org/ , Google Play `com.alen`, App Store id 634310816

## 3. Regulatory context (Nepal)

| Item | Status | Implication for us |
| --- | --- | --- |
| Electronic Transactions Act 2063 | Existence/subject **[official]** (ILO, Nepal Law Commission); section-level text not fetched | Consent/electronic records baseline; counsel to confirm |
| Privacy Act 2075 | **[official]** via ADB summary: protects personal data, documents, correspondence (incl. electronic); law-firm analysis treats contact details + blood group as personal and health data as sensitive. Statutory PDF not fetchable | Encrypt contact data, minimise, obtain consent, retain briefly |
| "National Data Privacy Policy 2021" | **[unverified]** — no authoritative instrument found under that title | Do not cite |
| NTA rules on commercial SMS/CLI/unsolicited messages | **[unverified]** — NTA site unavailable; only Twilio's vendor guidance found (sender-ID pre-registration, opt-in, HELP/STOP, daytime sending) | Follow prudent opt-in/opt-out controls; confirm with counsel (A4) |

Sources: https://lpr.adb.org/resource/privacy-act-2075-2018-nepal , https://www.ilo.org/resource/electronic-transactions-act-2063-2008 , https://lawimperial.com/data-protection-and-privacy-legislation-in-nepal/ , https://www.twilio.com/en-us/guidelines/np/sms

## 4. Product decisions derived from this research

1. **Consent-based contact exchange** (donor sees a request, responds, *then* contact is
   revealed to the requester) instead of a public donor directory — **[recommendation]**.
2. **Separate trust labels**: phone verified / org verified / self-reported / inventory
   reported-and-fresh vs stale — never one "verified" badge — **[recommendation]**.
3. **Freshness is always displayed** alongside inventory (`updated_at`, source, or
   "unknown") — addressing the pattern where stock claims are unlabelled — **[recommendation]**.
4. **Plain-language "not sure of group" guidance** rather than guessing compatibility —
   **[recommendation]**.
5. **Nepal-local ergonomics**: province→district→local level, Nepali language, low-bandwidth
   server rendering, call-first emergency guidance — **[assumption]**, grounded in the local
   market's observed expectations.
