# App Analytics – Mobile Ingestion API

Official integration reference for the **React Native analytics SDK**. Everything the mobile app needs to send analytics to the backend is here.

- **Collection:** `AppAnalytics.postman_collection.json`
- **Environment:** `AppAnalytics.postman_environment.json`

---

## 1. Setup

1. Import both JSON files into Postman (**Import → Files**).
2. Select the **App Analytics - Production** environment (top-right).
3. `base_url` is preset for each target:
   - **Production:** `https://mahindraappanalytics.crmlvoice.com/api/v1`
   - Local: `http://localhost:5001/api/v1` (matches `server/.env` `PORT`)
4. Send **Health → Health Check** to confirm connectivity.

### Environment variables

| Variable | Example | Purpose |
|---|---|---|
| `base_url` | `https://mahindraappanalytics.crmlvoice.com/api/v1` | API root (already includes `/api/v1`). |
| `jwt_token` | *(empty)* | Reserved for future auth. **Not required today.** |
| `user_id` | `USR001` | Current user id. |
| `session_id` | `SES-20260707-0001` | Current session id. |
| `device_id` | `DEV98765` | Device id (kept for SDK bookkeeping; not a separate endpoint). |
| `app_version` | `2.4.0` | App version string. |
| `platform` | `android` | `ios` \| `android` \| `web`. |

---

## 2. Conventions

### Authentication
**None.** These ingestion endpoints are currently **open** (rate-limited only). The `Authorization: Bearer {{jwt_token}}` header is included on requests but **disabled** and ignored by the server — leave it off until auth ships.

### Required headers
| Header | Value | When |
|---|---|---|
| `Content-Type` | `application/json` | All POST requests. |

### Response envelope
**Success**
```json
{ "success": true, "data": { } }
```
**Error**
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

### Timestamps
ISO-8601 UTC strings, e.g. `2026-07-07T10:20:30Z`. Omit to let the server stamp `now`.

### IDs
- `userId`, `sessionId`, and every `eventId` are **client-generated**. Use UUIDs for `sessionId`/`eventId`.
- Reusing a `sessionId` on `session/start` returns the existing session (no duplicate).
- Reusing an `eventId` on `events` skips that event (safe retries).

### Rate limiting
Ingestion endpoints allow **200 requests/minute** (per IP, configurable via `RATE_LIMIT_MAX`). Over the limit → `429 RATE_LIMIT_EXCEEDED`. **Batch events** to stay well under it.

---

## 3. Endpoint Summary Table

| # | Endpoint | Method | Purpose | Auth | Success | Batch |
|---|---|---|---|---|---|---|
| 1 | `/health` | GET | Liveness probe | None | 200 | — |
| 2 | `/ingest/identify` | POST | Create/update user profile — incl. role and dealership (upsert) | None | 200 | No |
| 3 | `/ingest/login` | POST | Record a login instance (drives user-activity classification) | None | 200 | No |
| 4 | `/ingest/session/start` | POST | Open session + device info | None | 201 | No |
| 5 | `/ingest/session/end` | POST | Close session, compute duration | None | 200 | No |
| 6 | `/ingest/screen` | POST | Screen visit + dwell time | None | 201 | No |
| 7 | `/ingest/events` | POST | All discrete events (see below) — incl. feature usage | None | 201 | **Yes (1–50)** |

### Conceptual events → real calls

| Mobile concept | Endpoint | `eventType` |
|---|---|---|
| Register / identify user | `/ingest/identify` | — |
| Role + dealership profile (designation, DOJ, Star ID, dealer name/category/state/city) | `/ingest/identify` | — |
| Login instance (drives frequent/occasional/low classification) | `/ingest/login` | — |
| Session start (+ device) | `/ingest/session/start` | — |
| Session end | `/ingest/session/end` | — |
| Screen view (dwell) | `/ingest/screen` | — |
| App open / close | `/ingest/events` | `app_open` / `app_close` |
| Login / logout (session-level event) | `/ingest/events` | `login` / `logout` |
| Screen view (event) | `/ingest/events` | `screen_view` |
| Button click / interaction | `/ingest/events` | `button_click` |
| Navigation | `/ingest/events` | `navigation` |
| Generic feature usage | `/ingest/events` | `custom` |
| Enquiry creation / review / follow-up | `/ingest/events` | `enquiry_creation` / `enquiry_review` / `enquiry_followup` |
| Product guide viewed | `/ingest/events` | `product_guide` |
| Village visit logged | `/ingest/events` | `village_visit` |
| Booking created | `/ingest/events` | `booking` |
| Delivery recorded | `/ingest/events` | `delivery` |
| API call / performance | `/ingest/events` | `api_call` |
| App startup time | `/ingest/events` | `app_startup` |
| Crash log | `/ingest/events` | `crash` |
| Error log | `/ingest/events` | `error` |

> There is **no** `/device`, `/crash`, `/performance`, or `/feature-usage` endpoint. Device info rides on `session/start`; crash & performance are event types on `/ingest/events`; feature usage (Dealer & Geography's underlying login activity and the Feature Usage dashboard's enquiry/product-guide/village-visit/booking/delivery tracking) rides on `/ingest/identify`, `/ingest/login`, and `/ingest/events` respectively — see 4.2, 4.2b, and 4.6b below.

---

## 4. Endpoints

### 4.1 `GET /health`
**Why:** Verify the backend is reachable before flushing events.
**Headers:** none. **Body:** none.

**Success `200`**
```json
{ "success": true, "data": { "status": "ok", "timestamp": "2026-07-07T10:20:30.000Z" } }
```

---

### 4.2 `POST /ingest/identify`
**Why:** Register/update the user so sessions & events attribute to a known user. Also carries the user's **role** and their **dealership** (name, category and billing address), which power the **Role Analytics** and **Dealer & Geography** dashboards.
**When:** On login, once the user profile has loaded. Idempotent upsert on `userId` — safe to call on every launch.
**Duplicates:** Idempotent upsert on `userId`.

> **Send this only after the profile has resolved.** `designation`, `doj`, `starId` and `dealer` all come from the same profile object. If identify fires before it loads, every one of them is missing together and the user lands with a name and nothing else. Calling identify a second time once the profile arrives is safe and costs nothing.

**Fields**

| Field | Type | Required | Rule |
|---|---|---|---|
| `userId` | string | ✅ | non-empty |
| `name` | string | ⬜ | — |
| `email` | string | ⬜ | valid email if present |
| `platform` | enum | ⬜ | `ios` \| `android` \| `web` |
| `designation` | enum | ⬜ | The app's `getUserRole()` output — see the 13 values below. `""` is accepted and simply not stored. |
| `mobile` | string | ⬜ | — |
| `doj` | ISO-8601 | ⬜ | Date of joining (`dateofJoining`) |
| `starId` | string | ⬜ | Employee Star ID (`employee_Star_Id`) |
| `dealer` | object | ⬜ | Dealership details — see below. Fields not included are left untouched. |

**`designation` — the 13 valid values.** An unrecognised role is rejected with `400`, deliberately: it surfaces app-side role drift immediately instead of silently storing a value no report knows about. A new role must be added server-side *before* the app ships it.

`Branch Manager`, `Dealer CEO`, `DES User`, `Distributor`, `FDW Coordinator`, `Franchise User`, `Sales Manager`, `Salesman`, `Mechanic`, `Service Advisor`, `Installer`, `Workshop Manager`, `Spare Store Manager`

**Dealership fields — the Salesforce account the user belongs to.** The address is the *dealership's* billing address, not the user's location. Send them flat at the top level (the app's shape), or nested under a `dealer` object; the raw Salesforce key names are accepted too.

| Flat key (app) | Nested key | Salesforce key | Example |
|---|---|---|---|
| `accountId` | `accountId` | `account_id` | `001OS00000PCbLJYA1` |
| `accountName` | `name` | `account_name` | `RUDRA AUTOMOBILES PVT LTD, Burdwan` |
| `dealerCategory` | `category` | `DealerCategory__c` | `DEALER` |
| `billingState` | `state` | `billing_state` | `WEST BENGAL` |
| `billingCity` | `city` | `billing_city` | `BURDWAN` |
| `billingPostalCode` | `postalCode` | `billing_postal_code` | `713104` |
| `billingStreet` | `street` | `billing_street` | `KHAGRAGARH MORE, G.T. Road` |
| `billingCountry` | `country` | `billing_country` | `India` |

> **`name` is the user, `accountName` is the dealership.** At the top level of the payload, `name` is the user's own name — the dealership must be sent as `accountName`. Only inside a nested `dealer` object does the bare key `name` mean the dealership.

Values are trimmed and case-normalised on write, so `WEST BENGAL` and `west bengal` land as one `West Bengal` and never split a filter into two entries. Empty strings are discarded rather than stored. Fields not included are left untouched, so a partial update never wipes the rest of the dealership.

**Only `DEALER` accounts appear in the dealer & geography reports.** The app sends `dealerCategory` only when the account is a dealership and `''` otherwise, but it sends that account's address either way — so a franchise or distributor address is stored and still excluded from dealer geography. `accountId` is the grouping key; without it the reports fall back to the account name, which merges same-named dealerships and splits renamed ones.

**Request**
```json
{
  "userId": "005OS000001XSm0YAG",
  "name": "Raut Vinay Dipak Kumar Rudra (CEO)",
  "email": "ceo@example.com",
  "platform": "android",
  "designation": "Dealer CEO",
  "mobile": "",
  "doj": "2002-08-22",
  "starId": "66958",
  "dealerCategory": "DEALER",
  "accountName": "RUDRA AUTOMOBILES PVT LTD, Burdwan",
  "accountId": "001OS00000PCbLJYA1",
  "billingStreet": "KHAGRAGARH MORE, G.T. Road",
  "billingCity": "BURDWAN",
  "billingPostalCode": "713104",
  "billingState": "WEST BENGAL",
  "billingCountry": "India"
}
```
**Success `200`**
```json
{ "success": true, "data": { "userId": "005OS000001XSm0YAG", "name": "Raut Vinay Dipak Kumar Rudra (CEO)", "platform": "android", "designation": "Dealer CEO", "dealer": { "accountId": "001OS00000PCbLJYA1", "name": "RUDRA AUTOMOBILES PVT LTD, Burdwan", "category": "DEALER", "state": "West Bengal", "city": "Burdwan", "postalCode": "713104" }, "firstSeenAt": "2026-07-07T10:20:30.000Z", "totalSessions": 0 } }
```
**Error `400`**
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "designation: designation must be one of: Branch Manager, Dealer CEO, ..." } }
```
**Status codes:** `200`, `400`, `429`.

---

### 4.2b `POST /ingest/login`
**Why:** Records one login instance. Distinct calendar days (UTC) with at least one login drive the **frequent (>20 days) / occasional (5–19) / low (1–4) / no-login (0)** classification shown on both the Role Analytics and Dealer & Geography dashboards.
**When:** Once per successful login (not per session — call this in addition to, not instead of, `session/start`).
**Duplicates:** Safe to call multiple times per day — `loginDays` only increments the first time a given UTC day is seen; `totalLogins` increments every call.

**Fields**

| Field | Type | Required | Rule |
|---|---|---|---|
| `userId` | string | ✅ | non-empty |
| `loginAt` | ISO-8601 | ⬜ | defaults `now` |

**Request**
```json
{ "userId": "USR001", "loginAt": "2026-07-07T10:20:30Z" }
```
**Success `200`**
```json
{ "success": true, "data": { "userId": "USR001", "loginDays": 12, "totalLogins": 34, "lastLoginAt": "2026-07-07T10:20:30.000Z" } }
```
**Status codes:** `200`, `400`, `429`.

---

### 4.3 `POST /ingest/session/start`
**Why:** Open a session and record device/context (this is the device-info endpoint).
**When:** On app foreground/cold start, once per session with a fresh `sessionId`.
**Duplicates:** Idempotent per `sessionId` (returns existing).

**Fields**

| Field | Type | Required | Rule |
|---|---|---|---|
| `sessionId` | string | ✅ | non-empty, unique |
| `userId` | string | ✅ | non-empty |
| `startTime` | ISO-8601 | ⬜ | defaults `now` |
| `platform` | enum | ⬜ | `ios` \| `android` \| `web` |
| `appVersion` | string | ⬜ | — |
| `osVersion` | string | ⬜ | — |
| `deviceModel` | string | ⬜ | — |
| `networkType` | enum | ⬜ | `wifi` \| `cellular` \| `offline` \| `unknown` |
| `location` | object | ⬜ | `{ country, city, lat, lng }` |

**Request**
```json
{
  "sessionId": "SES-20260707-0001",
  "userId": "USR001",
  "startTime": "2026-07-07T10:20:30Z",
  "platform": "android",
  "appVersion": "2.4.0",
  "osVersion": "15",
  "deviceModel": "Samsung Galaxy S24",
  "networkType": "wifi",
  "location": { "country": "India", "city": "Ahmedabad", "lat": 23.0225, "lng": 72.5714 }
}
```
**Success `201`** — returns the session document.
**Error `400`**
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "sessionId: sessionId is required" } }
```
**Status codes:** `201`, `400`, `429`.

---

### 4.4 `POST /ingest/session/end`
**Why:** Close a session; server computes `duration = endTime − startTime` (ms).
**When:** On app background/termination.
**Duplicates:** Safe; unknown `sessionId` → `200` with `data: null`.

**Fields**

| Field | Type | Required | Rule |
|---|---|---|---|
| `sessionId` | string | ✅ | non-empty |
| `userId` | string | ✅ | non-empty |
| `endTime` | ISO-8601 | ⬜ | defaults `now` |

**Request**
```json
{ "sessionId": "SES-20260707-0001", "userId": "USR001", "endTime": "2026-07-07T10:24:55Z" }
```
**Success `200`**
```json
{ "success": true, "data": { "sessionId": "SES-20260707-0001", "duration": 265000 } }
```
**Status codes:** `200`, `400`, `429`.

---

### 4.5 `POST /ingest/screen`
**Why:** Screen visit + dwell time → powers Top Screens, avg time, funnels.
**When:** On screen exit (so dwell is known).
**Duplicates:** Each call creates a new visit — don't resend.

> ⚠️ Field names are `entryTime` / `exitTime` / `duration` (ms) — **not** `enteredAt` / `leftAt` / `timeSpent`.

**Fields**

| Field | Type | Required | Rule |
|---|---|---|---|
| `sessionId` | string | ✅ | non-empty |
| `userId` | string | ✅ | non-empty |
| `screenName` | string | ✅ | non-empty |
| `entryTime` | ISO-8601 | ⬜ | defaults `now` |
| `exitTime` | ISO-8601 | ⬜ | — |
| `duration` | integer (ms) | ⬜ | `>= 0`; computed from entry/exit if omitted |

**Request**
```json
{
  "sessionId": "SES-20260707-0001",
  "userId": "USR001",
  "screenName": "HomeScreen",
  "entryTime": "2026-07-07T10:21:10Z",
  "exitTime": "2026-07-07T10:24:55Z",
  "duration": 225000
}
```
**Success `201`** — returns the screen-visit document.
**Status codes:** `201`, `400`, `429`.

---

### 4.6 `POST /ingest/events` (batch)
**Why:** Single endpoint for all discrete events (app open/close, login/logout, clicks, navigation, custom feature usage, API-call performance, app startup, crashes, errors).
**When:** Buffer events on-device and flush in batches.
**Duplicates:** De-duplicated on `eventId`; already-seen events are skipped (`inserted` may be < `total`).

**Body:** `{ "events": [ ...1 to 50 items... ] }`

**Event fields**

| Field | Type | Required | Rule / Notes |
|---|---|---|---|
| `eventId` | string | ✅ | unique per event (UUID) |
| `sessionId` | string | ✅ | non-empty |
| `userId` | string | ✅ | non-empty |
| `eventType` | enum | ✅ | `app_open`, `app_close`, `login`, `logout`, `screen_view`, `screen_exit`, `button_click`, `navigation`, `api_call`, `error`, `crash`, `app_startup`, `custom`, `enquiry_creation`, `enquiry_review`, `enquiry_followup`, `product_guide`, `village_visit`, `booking`, `delivery` |
| `eventName` | string | ✅ | non-empty |
| `screenName` | string | ⬜ | screen context |
| `timestamp` | ISO-8601 | ⬜ | defaults `now` |
| `properties` | object | ⬜ | arbitrary key/values (put `eventCategory`, `stackTrace`, etc. here) |
| `duration` | number (ms) | ⬜ | timed events |
| `errorMessage` | string | ⬜ | `error` / `crash` |
| `apiEndpoint` | string | ⬜ | `api_call` |
| `statusCode` | number | ⬜ | `api_call` |
| `metrics` | object | ⬜ | `{ loadTimeMs, startupTimeMs, responseTimeMs }` — each `>= 0` |

**Request (batch)**
```json
{
  "events": [
    { "eventId": "8f1c...", "sessionId": "SES-20260707-0001", "userId": "USR001", "eventType": "button_click", "eventName": "Book Now Clicked", "screenName": "HomeScreen", "properties": { "buttonName": "Book Now" }, "timestamp": "2026-07-07T10:25:30Z" },
    { "eventId": "a20d...", "sessionId": "SES-20260707-0001", "userId": "USR001", "eventType": "api_call", "eventName": "GET /market-prices", "apiEndpoint": "/api/market-prices", "statusCode": 200, "metrics": { "responseTimeMs": 480 }, "timestamp": "2026-07-07T10:25:31Z" }
  ]
}
```
**Success `201`**
```json
{ "success": true, "data": { "inserted": 2, "total": 2 } }
```
**Error `400`**
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "events: events must be an array of 1–50 items" } }
```
**Status codes:** `201`, `400`, `429`.

#### Per-type payload cheatsheet

| Event | `eventType` | Key extra fields |
|---|---|---|
| App open/close | `app_open` / `app_close` | — |
| Login/logout | `login` / `logout` | `properties.method` |
| Screen view | `screen_view` | `screenName`, `metrics.loadTimeMs` |
| Button click | `button_click` | `screenName`, `properties` |
| Navigation | `navigation` | `properties.from` |
| Generic feature usage | `custom` | `eventName`, `properties.feature` |
| Enquiry created | `enquiry_creation` | `properties.enquiryId` |
| Enquiry reviewed | `enquiry_review` | `properties.enquiryId` |
| Enquiry followed up | `enquiry_followup` | `properties.enquiryId` |
| Product guide viewed (Salesman) | `product_guide` | `properties.productId` |
| Village visit logged (Salesman) | `village_visit` | `properties.villageName` |
| Booking created (Sales Manager/Coordinator) | `booking` | `properties.bookingId` |
| Delivery recorded (Sales Manager/Coordinator) | `delivery` | `properties.deliveryId` |
| API performance | `api_call` | `apiEndpoint`, `statusCode`, `metrics.responseTimeMs` |
| App startup | `app_startup` | `metrics.startupTimeMs` |
| Crash | `crash` | `errorMessage`, `properties.stackTrace`, `properties.fatal` |
| Error | `error` | `errorMessage`, `properties.code` |

> **Feature Usage dashboard note:** the `/dashboard/feature-usage?role=salesman|manager` endpoint splits rows by the user's `designation` on `/ingest/identify` (`Salesman` → salesman group; `Sales Manager`/`Branch Manager` → manager group) and by these `eventType`s. Until at least one such event exists for a role group, the dashboard shows demo/synthetic figures — real events take over automatically once ingested.

---

### 4.6b Feature usage — example batch

```json
{
  "events": [
    { "eventId": "fu-8f1c...", "sessionId": "SES-20260707-0001", "userId": "USR001", "eventType": "enquiry_creation", "eventName": "Enquiry Created", "properties": { "enquiryId": "ENQ-4821" }, "timestamp": "2026-07-07T10:25:30Z" },
    { "eventId": "fu-a20d...", "sessionId": "SES-20260707-0001", "userId": "USR001", "eventType": "product_guide", "eventName": "Product Guide Viewed", "properties": { "productId": "TR-450" }, "timestamp": "2026-07-07T10:26:10Z" },
    { "eventId": "fu-c99e...", "sessionId": "SES-20260707-0001", "userId": "USR001", "eventType": "village_visit", "eventName": "Village Visit Logged", "properties": { "villageName": "Sanand" }, "timestamp": "2026-07-07T10:40:00Z" }
  ]
}
```

---

## 5. Error Reference

| HTTP | `error.code` | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body failed validation (message lists offending fields). |
| 400 | `BAD_REQUEST` | Malformed request. |
| 409 | `CONFLICT` | Duplicate unique key. |
| 422 | `VALIDATION_ERROR` | Mongoose-level schema validation failure. |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests — back off and batch. |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error. |

---

## 6. Recommended SDK call sequence

```
App launch
  → POST /ingest/identify            (after the profile resolves; include role + dealer)
  → POST /ingest/login                (once per successful login)
  → POST /ingest/session/start       (fresh sessionId, device info)
  → POST /ingest/events [app_open, app_startup(metrics)]

During use (buffered, flushed in batches of ≤50)
  → POST /ingest/screen              (on each screen exit)
  → POST /ingest/events [screen_view, button_click, navigation, custom, api_call, error,
                          enquiry_creation, enquiry_review, enquiry_followup,
                          product_guide, village_visit, booking, delivery]

On crash
  → buffer crash event; flush on next launch

App background / exit
  → POST /ingest/events [app_close]
  → POST /ingest/session/end
```

---

## 7. Notes for the backend team (gaps & recommendations)

The mobile spec asked for a few things that **do not exist** in the current backend. Documented above as they truly are; flagged here in case you want to add them:

1. **Authentication (Login / Refresh Token).** No auth layer exists. If analytics must be authenticated, add JWT middleware and a `/auth/*` route group, then enable the `Authorization` header in the collection.
2. **Dedicated `/device`, `/crash`, `/performance` endpoints.** Intentionally **not** created — they'd duplicate data. Device info is on `session/start`; crash/performance are event types on `/ingest/events` (with the `metrics` sub-doc already added to the `Event` model). Recommend keeping this model.
3. **`deviceId` as a first-class field.** Currently device identity is implicit (`deviceModel` on session). If you need per-device analytics, add a `deviceId` field to `Session` and thread it through `session/start`.
