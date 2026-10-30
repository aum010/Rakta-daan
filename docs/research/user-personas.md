# User personas

## P1 — Sita, family requester (primary)

*30s, Kathmandu Valley, mid-range Android, 3G/4G, Nepali first language.*

Relative admitted to a hospital; a doctor says two units of A+ whole blood are needed today.
She is stressed, on the phone, and has **no patience for sign-up walls**. She opens Rakta-Daan
from a shared link, taps **Find blood**, and either sees nearby blood banks with phone numbers
and freshness, or uses the **"not sure of group"** path when the group is unclear.

*Needs:* immediate first useful screen, plain Nepali, one-tap calling, a shareable request
link she can paste into Viber/WhatsApp groups, and an honest "no results — try these banks"
state instead of a blank screen.
*Frustrations:* forms that ask for clinical detail she doesn't know; being shown a donor
"available" that isn't; a spinner that never ends.
*Privacy expectation:* her phone number must not be published on a shared link.

## P2 — Bikash, regular donor

*20s, student, volunteers occasionally, has a Viber and WhatsApp number, wary of spam.*

Registered to be reached when his blood group is needed near him. He wants control: when he
is available, how he is contacted, and an easy way to say **STOP**. He does not want to be
matched to requests outside his district or during exams.

*Needs:* availability toggle, per-channel consent, clear alerts with a one-tap respond link,
and confidence that his number is never handed out publicly.
*Frustrations:* repeated messages for the same request; alerts at 2 a.m.; no way to opt out.
*Privacy expectation:* number revealed only to a requester after he chooses to respond.

## P3 — Hospital/blood-bank staff (Priya)

*Works at a blood bank; maintains stock between shifts; shares the account with two
colleagues.*

Publishes inventory for her organisation only, with a timestamp, so requesters stop calling
to ask "do you have O− today?" She needs role separation (she edits, her colleague only
views) and a visible record of who changed what.

*Needs:* fast inventory entry, freshness display, role-based permissions, verification state
she can trust is about the *organisation*, not clinical screening.
*Frustrations:* being shown as "verified" for something she never claimed; another
department editing her numbers.

## P4 — Camp organiser (Dipendra)

Runs periodic voluntary donation camps; wants the camp listed with date, venue and organiser
so donors turn up. Administrative, low-frequency use.

## P5 — Administrator (Rojina)

Verifies organisations, triages abuse reports and investigates incidents. Must be able to do
her job **without** blanket access to everyone's private data: she sees verification state,
audit trails and report content, not donor phone numbers.

## Cross-cutting constraints

* **Low bandwidth:** server-rendered pages, no heavy client bundles, system font stack.
* **Accessibility:** keyboard operable, visible focus, labelled inputs, sufficient contrast,
  no color-only status (WCAG 2.2 AA target).
* **Bilingual:** every UI string comes from `en`/`ne` dictionaries; switching preserves route.
* **Trust:** demo content is visibly labelled as demo; nothing decorative pretends to be
  production data.
