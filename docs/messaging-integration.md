# Messaging integration

## 1. Design

```
domain event (request created / response received / …)
        │
        ▼
enqueue (src/lib/messaging/outbox.ts)   — consent re-check, opt-out check, dedupe_key
        │  messages.state = 'queued'
        ▼
cron  /api/internal/outbox  (bearer CRON_SECRET)   or   pnpm outbox
        │
        ▼
adapter (src/lib/messaging/adapters.ts)
   ├─ mock      → truthful `simulated` state (default in development)
   ├─ sparrow   → Nepal SMS aggregator (SPARROW_* env)
   └─ whatsapp  → WhatsApp Cloud API (WHATSAPP_* env)
        │
        ▼
messages.state = sent → delivered | failed   (+ last_error, attempts, sent_at)
```

The `messages` table is the queue. No broker, no parallel duplicate path.

## 2. Delivery states are truthful

| State | Meaning |
| --- | --- |
| `queued` | Accepted for delivery, **not** sent yet |
| `sent` | Provider accepted the message (accepted ≠ delivered) |
| `delivered` | Provider confirmed delivery (webhook receipt) |
| `failed` | Provider rejected or attempts exhausted — inspectable via `last_error` |
| `simulated` | No real provider configured; **never displayed as delivered** |

The UI labels simulated sends as simulated. The smoke test asserts this behaviour.

## 3. Channels

### 3.1 SMS (Nepal) — primary launch channel
* Adapter: `sparrow` (`SPARROW_TOKEN`, `SPARROW_SENDER_ID`, `SPARROW_API_URL`).
* Research status: **vendor-claimed** that local aggregators cover NTC/Ncell with registered
  sender IDs; **Twilio's Nepal guide (official)** states alphanumeric sender IDs must be
  pre-registered and two-way SMS is unsupported. Must be confirmed with a live test before
  launch (assumption A1).

### 3.2 WhatsApp Cloud API — secondary
* Adapter: `whatsapp` (`WHATSAPP_*`), template-based messages only.
* **Official-source-verified**: templates must be approved before sending
  (developers.facebook.com template docs); utility category for non-promotional alerts;
  opt-in required before messaging; 24-hour customer-service window applies to inbound
  conversations; pricing is per delivered message by category and market.
* Our alert template is a *utility* template; marketing content is prohibited inside it.
* Status: **credentials not configured** — adapter implemented, unverified live.

### 3.3 Viber — not implemented
* **Official-source-verified**: Viber's REST Bot API is subscriber-based and bots have been
  commercial-only since 5 Feb 2024; phone-number-based outreach requires Viber *Business
  Messages* through an official partner. Nepal coverage/pricing unconfirmed, so no code was
  written rather than shipping an unverifiable integration.

### 3.4 Messenger — not implemented
* **Official-source-verified**: replies are possible inside the 24-hour window after a user
  messages the Page; outside it only approved tags, and Meta documents tag restrictions
  (including a dated change to `ACCOUNT_UPDATE`/`CONFIRMED_EVENT_UPDATE`). Unsolicited
  transactional alerts are not a good fit → out of scope for v1.

## 4. Consent and opt-out

1. Donor must have an active consent for the channel (`donor_consents`) — checked at enqueue.
2. Re-checked at send time (consent may be revoked while queued).
3. Phone-level `opt_outs` (inbound `STOP` webhook) suppresses all further sends.
4. No bulk/marketing campaigns exist in the codebase, by design.

## 5. Inbound webhooks

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `POST /api/webhooks/sms` | Bearer `WEBHOOK_SECRET` | `stop`/`start` keywords → opt-out/opt-in |
| `POST /api/webhooks/whatsapp` | Meta `X-Hub-Signature-256` HMAC with `WHATSAPP_APP_SECRET` | Delivery receipts → update `messages.state` |

Both are exercised in tests/smoke with synthetic requests (401 without the secret).

## 6. Idempotency and rate safety

* `dedupe_key` = `request:<id>:<donor>:<channel>` prevents double enqueue and double send.
* Attempt counter with bounded retries; failures remain inspectable.
* Notifications per request are limited (radius, donor caps) to avoid flooding a small
  community with one emergency request.

## 7. What is required to go live

| Channel | Required | Blocked by |
| --- | --- | --- |
| SMS | Aggregator account, registered sender ID, live test with NTC + Ncell SIMs | Credentials + procurement test (A1) |
| WhatsApp | Meta business verification, phone number ID, **approved utility template** | Template approval (A2) |
| Viber | Partner agreement for Business Messages | Commercial decision — not implemented |
