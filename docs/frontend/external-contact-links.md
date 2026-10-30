# External contact links

Rakta-Daan connects a requester to a facility or a donor through channels that already
exist on their phone. It deliberately ships **no inbox**: there is no in-app chat, no
thread list, and no direct-messaging surface anywhere in the product.

## Why there is no internal messaging

The product brief forbids building an internal messaging platform, and the constraint is a
good one for this domain: an inbox implies delivery, moderation, retention and abuse
handling that a frontend-only prototype cannot honestly provide. An earlier revision of the
prototype contained a local-only chat; it was removed and replaced by the contact panel
below. The domain types around conversations were kept, because what they actually model
is **contact disclosure consent and channel capability**, not message transport.

## What each channel actually does

The single source of truth for this table is `CHANNEL_SUPPORT` in
[`src/lib/coordination/types.ts`](../../src/lib/coordination/types.ts). The UI derives its
label and badge tone from it, so a channel cannot be described as working unless the code
says it is implemented.

| Channel | Where it appears | Status | What actually happens |
|---|---|---|---|
| Telephone (call preview) | Contact panel | **Simulated** | Opens an in-page preview. Nothing is dialled; the panel says so. |
| `tel:` link | Blood-bank directory, camp listings, public request page, find guidance, requester dashboard | **Works** | Hands off to the device dialler. The number is a fixture in the demo dataset. |
| WhatsApp | Contact panel | **Not connected** | Listed with an explicit "not connected" note. No message is composed or queued. |
| Viber | Contact panel | **Not connected** | As above. |
| SMS | Contact panel | **Not connected** | As above. |
| Messenger | Not shown | **Not connected** | Retained in the domain enum only; the panel does not render it. |
| In-app messages | Removed | **n/a** | No composer, no thread, no route. |

The contact panel also states, in the panel itself, that no message, call or SMS is
delivered from this prototype.

## Where to find contact in the UI

- **Requester → donors:** `/en/app/track` → **Contact** tab.
- **Donor → requester:** `/en/app/donor` → the **Contact** button on an accepted invitation
  opens the same panel inline.
- **Anyone → facility:** `tel:` links on the directory, camp and public request pages.
- **Either side, later:** `/en/app/profile` → **Contact preferences** holds the channel and
  number the person wants the other side to use, and links back to the Contact tab to share it.
- **During the trip:** `/en/app/track` → **Overview** shows the trip map alongside the contact
  actions, so "where are they" and "how do I reach them" sit on one screen.

## Contact disclosure

Contact details are hidden by default and only appear after the person sharing them
opts in:

- State lives in the coordination store as a `Conversation` record keyed
  `conv:{requestId}:{donorId}`, with `contactDisclosed: false` as the default.
- The requester and the donor each control their own disclosure; either side can withdraw
  it at any time, and "Reset demo data" clears it.
- The displayed number is a reserved fictional range (`+977-1-555-0100`) and is labelled
  as demo data next to every reveal.
- No donor's private contact details or precise location are ever public — see
  [location-tracking.md](location-tracking.md).

## Integration boundary (going live)

Real delivery already has a home in the codebase; it is simply not wired to a provider:

- `src/lib/messaging/` — adapters, outbox, templates.
- `MESSAGING_PROVIDER=mock` reports states as `simulated`, never `delivered`.
- API routes `/api/v1/auth/otp/*`, `/api/webhooks/sms`, `/api/webhooks/whatsapp`.

To go live you must configure a provider, set `WEBHOOK_SECRET`, and re-point the contact
panel's channel rows at the real endpoints. Until then the honest behaviour is the current
one: **listed, labelled, not connected**.

## Rules this document exists to enforce

1. Never render a channel as "working" unless `CHANNEL_SUPPORT` says `implemented`.
2. Never claim a message was sent when the provider returned `simulated`.
3. Never expose a contact detail that its owner has not disclosed.
4. Never add an inbox, thread or direct-messaging surface.
