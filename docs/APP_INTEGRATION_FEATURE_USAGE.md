# App Integration Guide — Analytics Ingest & Feature Usage

**Audience:** Mobile app team
**Base URL:** `https://mahindraappanalytics.crmlvoice.com/api/v1`
**Auth:** None. All `/ingest/*` endpoints are public.
**Headers:** `Content-Type: application/json`
**Limits:** 200 requests/minute · 2 MB max request body · max 50 events per batch

---

## 1. Why this document

The Feature Usage dashboard (Enquiry Creation, Enquiry Review, Enquiry Follow-up, Product Guide, Village Visit, Booking, Delivery) currently shows **placeholder data**, not real app data.

Two independent problems cause this. **Both must be fixed** — neither alone is enough:

| # | Problem | Effect |
|---|---------|--------|
| 1 | Events are POSTed as a flat single object instead of an array, with no `eventId` | Every `/ingest/events` call fails validation with `400`. **Nothing is stored.** |
| 2 | `/ingest/identify` does not send `designation` | No user matches a role group, so the dashboard falls back to placeholder data regardless of events |

Additionally, Booking and Enquiry Follow-up are sent as `eventType: "custom"`, which the Feature Usage aggregation ignores.

---

## 2. Call order

Per app launch / login:

```
1. POST /ingest/identify        → once, at login (must include designation)
2. POST /ingest/login           → once, at login
3. POST /ingest/session/start   → once, when app opens
4. POST /ingest/events          → many, batched, during use
   POST /ingest/screen          → many, on screen exit
5. POST /ingest/session/end     → once, when app closes/backgrounds
```

`identify` must run before events, so the user record exists with its `designation`.

---

## 3. `POST /ingest/identify`

Call once per login. **`designation` is mandatory for Feature Usage** — it decides whether the user appears in the Salesman or the Manager view.

### Payload

```json
{
  "userId": "EMP10234",
  "name": "Ramesh Kumar",
  "email": "ramesh@example.com",
  "platform": "android",

  "designation": "Salesman",

  "zone": "North Zone",
  "state": "Punjab",
  "ao": "Ludhiana AO",
  "dealer": "Sharma Tractors",
  "branch": "Ludhiana Main",
  "tm": "TM-4471",
  "mobile": "9876543210",
  "doj": "2023-04-01T00:00:00.000Z",
  "starId": "STAR-8891"
}
```

### Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `userId` | string | **Yes** | Stable employee/user ID. Same value everywhere. |
| `name` | string | No | |
| `email` | string | No | Must be a valid email if sent |
| `platform` | enum | No | `ios` \| `android` \| `web` |
| `designation` | enum | **Yes (for Feature Usage)** | Exact strings only — see below |
| `zone` `state` `ao` `dealer` `branch` `tm` | string | Recommended | Powers Geography + Dealer/AO/TM dashboards |
| `mobile` | string | No | |
| `doj` | ISO 8601 | No | Date of joining |
| `starId` | string | No | |

### `designation` allowed values

Any other value returns `400` and the whole call fails.

| Value | Feature Usage view |
|---|---|
| `Salesman` | Salesman |
| `Sales Manager` | Manager |
| `Coordinator` | Manager |
| `Branch Manager` | neither |
| `Dealer Admin` | neither |
| `Regional Manager` | neither |

---

## 4. `POST /ingest/events` — the wrapper

This is the change that unblocks everything. Applies to **every** event, not just feature events.

### ❌ Current (rejected with 400)

```json
{
  "sessionId": "...",
  "userId": "...",
  "eventType": "custom",
  "eventName": "Booking Recorded"
}
```

### ✅ Required

```json
{
  "events": [
    {
      "eventId": "b7f3c2e1-4a8d-4f21-9c33-6de2a1b90f45",
      "sessionId": "9f2a1c40-7d31-4a02-b8e5-1c4471f0aa93",
      "userId": "EMP10234",
      "eventType": "booking",
      "eventName": "Booking Recorded",
      "screenName": "BookingTab",
      "properties": { "bookingId": "BK-99213" },
      "timestamp": "2026-08-12T09:41:22.104Z"
    }
  ]
}
```

### Rules

- **`events` must be an array**, 1–50 items. Batching is encouraged.
- **`eventId` must be a globally unique UUID per event.** It is the dedupe key — re-sending the same `eventId` is safely ignored by the server, which makes offline retry queues safe to implement.
- **`timestamp`** must be captured when the action happened, not when the request is sent. If omitted, the server stamps receive-time, which corrupts any queued/offline events.
- **`sessionId`** must be the exact same string passed to `/ingest/session/start`.

> **Please stop using the auth access token as `sessionId`.**
> Use a UUID generated once per app-open. A token refresh mid-session splits one session into two, breaks the session↔event join, and stores a credential in the analytics database.

### Field reference

| Field | Type | Required | Notes |
|---|---|---|---|
| `eventId` | string | **Yes** | Unique UUID; duplicates dropped |
| `sessionId` | string | **Yes** | Must match the active session |
| `userId` | string | **Yes** | Same ID as identify |
| `eventType` | enum | **Yes** | See §5; unknown values rejected |
| `eventName` | string | **Yes** | Free-text label |
| `screenName` | string | No | Also feeds per-session screen lists |
| `timestamp` | ISO 8601 | No | Always send it |
| `properties` | object | No | Free-form; put business IDs here |
| `duration` | number | No | Milliseconds |
| `errorMessage` | string | No | **Top-level**, for error events |
| `apiEndpoint` | string | No | For `api_call` events |
| `statusCode` | number | No | Must be a number — never `""` |
| `metrics` | object | No | **Only** `loadTimeMs`, `startupTimeMs`, `responseTimeMs` are stored. Any other key inside `metrics` is silently discarded. |

---

## 5. `eventType` values for Feature Usage

The dashboard aggregates **strictly on `eventType`**. `eventName` is a display label only and does not affect aggregation — sending `eventType: "custom"` makes the event invisible to Feature Usage.

| Feature on dashboard | Required `eventType` | Shown in | Status today |
|---|---|---|---|
| Enquiry Creation | `enquiry_creation` | Both views | Not sent |
| Enquiry Review | `enquiry_review` | Both views | Not sent |
| Enquiry Follow-up | `enquiry_followup` | Both views | **Sent as `custom` — fix type** |
| Product Guide | `product_guide` | Salesman | Not sent |
| Village Visit | `village_visit` | Salesman | Not sent |
| Booking | `booking` | Manager | **Sent as `custom` — fix type** |
| Delivery | `delivery` | Manager | Not sent |

> **❓ Question for the app team:** the event labelled *EnquiryCreation* in your notes sends `eventName: "Enquiry Followup Created"` on screen `EnquiryFollowup`. Does it fire when an enquiry is **created** or when a **follow-up** is logged? If creation → use `enquiry_creation`. If follow-up → use `enquiry_followup`, and enquiry creation is not yet instrumented at all. Please confirm.

### Other valid `eventType` values

For non-feature events, the full enum is:

`app_open`, `app_close`, `login`, `logout`, `screen_view`, `screen_exit`, `button_click`, `navigation`, `api_call`, `error`, `crash`, `app_startup`, `custom`

---

## 6. Payload for each feature event

All seven go to `POST /ingest/events` inside the same `events: []` wrapper. Fire each when the user **completes** the action. `properties` is free-form and stored as-is — include the business ID so records can be traced back.

```json
{
  "events": [
    {
      "eventId": "<uuid>",
      "sessionId": "<session>",
      "userId": "EMP10234",
      "eventType": "enquiry_creation",
      "eventName": "Enquiry Created",
      "screenName": "EnquiryCreate",
      "properties": { "enquiryId": "ENQ-00231" },
      "timestamp": "2026-08-12T09:41:22.104Z"
    },
    {
      "eventId": "<uuid>",
      "sessionId": "<session>",
      "userId": "EMP10234",
      "eventType": "enquiry_review",
      "eventName": "Enquiry Reviewed",
      "screenName": "EnquiryDetail",
      "properties": { "enquiryId": "ENQ-00231" },
      "timestamp": "..."
    },
    {
      "eventId": "<uuid>",
      "sessionId": "<session>",
      "userId": "EMP10234",
      "eventType": "enquiry_followup",
      "eventName": "Enquiry Followup Created",
      "screenName": "EnquiryFollowup",
      "properties": { "enquiryId": "ENQ-00231" },
      "timestamp": "..."
    },
    {
      "eventId": "<uuid>",
      "sessionId": "<session>",
      "userId": "EMP10234",
      "eventType": "product_guide",
      "eventName": "Product Guide Opened",
      "screenName": "ProductGuide",
      "properties": { "productCode": "YUVO-575" },
      "timestamp": "..."
    },
    {
      "eventId": "<uuid>",
      "sessionId": "<session>",
      "userId": "EMP10234",
      "eventType": "village_visit",
      "eventName": "Village Visit Logged",
      "screenName": "VillageVisit",
      "properties": { "villageName": "Dhanaula", "visitId": "VV-1182" },
      "timestamp": "..."
    },
    {
      "eventId": "<uuid>",
      "sessionId": "<session>",
      "userId": "EMP10234",
      "eventType": "booking",
      "eventName": "Booking Recorded",
      "screenName": "BookingTab",
      "properties": { "bookingId": "BK-99213" },
      "timestamp": "..."
    },
    {
      "eventId": "<uuid>",
      "sessionId": "<session>",
      "userId": "EMP10234",
      "eventType": "delivery",
      "eventName": "Delivery Completed",
      "screenName": "DeliveryTab",
      "properties": { "bookingId": "BK-99213", "deliveryId": "DL-7741" },
      "timestamp": "..."
    }
  ]
}
```

> `properties` key names above are suggestions. The backend stores the object as-is, so any keys work — but please confirm them with the analytics team before building, since they are used for later reporting.

### Partial rollout is fine

Ship whichever features are ready. Once **any** feature event arrives for a role group, the dashboard switches off placeholder data for that entire view: instrumented features show real numbers, uninstrumented ones show a genuine zero. All seven are not required before the page becomes trustworthy.

---

## 7. Suggested client implementation

A minimal queue that satisfies the batching, dedupe and offline rules:

```js
import { v4 as uuid } from 'uuid';

const BASE = 'https://mahindraappanalytics.crmlvoice.com/api/v1';
let queue = [];

// Call this from anywhere in the app.
export function track(eventType, eventName, { screenName, properties } = {}) {
  queue.push({
    eventId: uuid(),                       // unique per event — never reuse
    sessionId: analytics.sessionId,        // per app-open UUID, not the token
    userId: analytics.userId,
    eventType,
    eventName,
    screenName,
    properties,
    timestamp: new Date().toISOString(),   // captured NOW, not at send time
  });
  if (queue.length >= 20) flush();
}

export async function flush() {
  if (!queue.length) return;
  const batch = queue.splice(0, 50);       // hard server cap is 50
  try {
    const res = await fetch(`${BASE}/ingest/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),   // ← the wrapper
    });
    if (!res.ok) {
      console.error('[analytics] ingest failed', res.status, await res.text());
      queue.unshift(...batch);             // safe to retry: eventId dedupes
    }
  } catch (err) {
    console.error('[analytics] network error', err);
    queue.unshift(...batch);
  }
}

// Flush on a timer and when the app backgrounds.
setInterval(flush, 30_000);
```

Usage at the call site:

```js
track('booking', 'Booking Recorded', {
  screenName: 'BookingTab',
  properties: { bookingId: response?.data?.responseBody?.id },
});
```

---

## 8. Responses

**Success**
```json
{ "success": true, "data": { "inserted": 3, "total": 3 } }
```

**Failure**
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

Please **log and surface non-2xx responses** during integration. A silently-ignored `400` is exactly how the current issue went unnoticed.

---

## 9. Other fixes outside Feature Usage

Small, already built server-side:

**`POST /ingest/login` is never called.** Without it, login counts stay at zero and the user-classification feature cannot work. One call at login, alongside `identify`:

```json
{ "userId": "EMP10234", "loginAt": "2026-08-12T09:30:00.000Z" }
```

**Performance (`api_call`) events lose data.** `outcome` and `errorMessage` are nested inside `metrics`, where the server discards them. Move `errorMessage` to the top level and `outcome` into `properties`. Send `statusCode` as a number (not `""`), and add a `timestamp` — these events currently have none.

```json
{
  "eventId": "<uuid>",
  "sessionId": "<session>",
  "userId": "EMP10234",
  "eventType": "api_call",
  "eventName": "GET /enquiries",
  "apiEndpoint": "/enquiries",
  "statusCode": 200,
  "duration": 412,
  "properties": { "outcome": "success" },
  "metrics": { "responseTimeMs": 412 },
  "timestamp": "2026-08-12T09:41:22.104Z"
}
```

---

## 10. Checklist

- [ ] Wrap all events in `{ "events": [ … ] }`
- [ ] Generate a unique `eventId` (UUID) per event
- [ ] Send `designation` on `/ingest/identify`, using the exact enum strings
- [ ] Send org hierarchy fields (`zone`, `state`, `ao`, `dealer`, `branch`, `tm`) where known
- [ ] Switch Booking from `custom` → `booking`
- [ ] Switch Enquiry Follow-up from `custom` → `enquiry_followup`
- [ ] Confirm whether enquiry **creation** is instrumented separately
- [ ] Instrument remaining features as scope allows
- [ ] Use a per-app-open UUID for `sessionId`, not the access token
- [ ] Send an accurate `timestamp` on every event
- [ ] Call `POST /ingest/login` at login
- [ ] Fix performance-event field nesting
- [ ] Log non-2xx ingest responses

---

*Questions on any field, or to confirm the enquiry-creation behaviour, please come back to the analytics team before implementing.*
