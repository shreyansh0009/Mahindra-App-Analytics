# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Enterprise Mobile Analytics Dashboard for the Mahindra farm-equipment app — a Mixpanel/Firebase-style platform. The mobile app POSTs events to the Express backend; the React dashboard visualizes them. Deployed as a single Node process behind nginx (Express serves the built React app), with MongoDB Atlas as the store.

## Commands

### Server (from `server/`)
```bash
pnpm dev      # nodemon hot-reload
pnpm start    # production
pnpm seed     # WIPES users/sessions/events/screen_visits/analytics_summaries, then regenerates 30 days of sample data
```
No test suite in either `server/` or `client/` (`pnpm test` in `server/` is the npm placeholder that exits 1).

### Client (from `client/`)
```bash
npm run dev       # Vite dev server — http://localhost:5173
npm run build     # production build to client/dist/ (what the server serves in prod)
npm run lint      # ESLint
npm run preview   # serve production build locally
```

### Environment
- Copy `server/.env.example` → `server/.env`. Vars: `MONGO_URI`, `PORT`, `NODE_ENV`, `CORS_ORIGIN`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`. All have defaults in `config/env.js`; `JWT_SECRET` defaults to an insecure placeholder.
- `CORS_ORIGIN` is read into `config/env.js` but **not used** — `index.js` hardcodes `cors({ origin: '*' })`. Change `index.js` if you need to lock origins down.
- Client reads `VITE_API_URL`: `client/.env` → `http://localhost:5001/api/v1` for local dev, `client/.env.production` → `/api/v1` (same-origin, since Express serves the SPA). `.env.example` sets `PORT=5000` while the client's dev URL points at 5001 — pick one and keep both in sync locally.
- Lockfiles and `.env*` are gitignored at the repo root.

### Maintenance scripts (from `server/`, `node scripts/<name>.js`)
Read-only diagnostics: `measure-storage`, `diagnose-growth`, `measure-retention-options`, `estimate-mysql-size`, `check-selfhost-fit`, `audit-client-requirements` (which requirement fields real users actually have — "code gap or data gap?").

Mutating scripts are **dry-run by default and take `--apply` to write**: `backfill-normalize-api-names`, `purge-api-call-events` (also `--days=N`), `drop-geo-fields`, `drop-redundant-indexes`, `rebuild-eventname-index`. They are batched and safe to re-run/interrupt. Preserve that convention in any new script.

These exist because the database runs on an **Atlas M0 (512MB) tier billed on logical `dataSize + indexSize`**. That constraint drives several design decisions below — before adding a field, an index, or a high-volume event type, consider its storage cost.

## Architecture

### Real data vs. synthetic data — read this first
Not every dashboard number comes from the database. The boundary is deliberate and load-bearing:

| Surface | Source |
|---|---|
| `services/roleService.js`, `dealerService.js`, `dashboardService.js`, `userService.js`, `sessionService.js`, `eventService.js`, `screenService.js`, `analyticsService.js`, `reportService.js` | Real Mongo aggregations |
| `services/usageService.js` → `getScreenUsage` / `getModuleUsage` / `getWorkflowBreak` | **Fabricated** — deterministic seeded-hash generator in `data/usageTaxonomy.js`, no DB reads. Stable across refreshes, reactive to filters/date range |
| `services/usageService.js` → `getRoleUsage` | Real Mongo aggregation (despite living in usageService) |
| `services/featureUsageService.js` | Real `Event` + `User` aggregation **once feature events exist for a role group**; otherwise falls back to the same synthetic generator |

The three fabricated pages (Screen Usage, Module Usage, Workflow Break) are **commented out** in `client/src/App.jsx` and `layouts/Sidebar.jsx`; `ROUTES` entries and page files still exist and the backend endpoints still respond. The catch-all route redirects those paths to the dashboard. Don't re-enable them without replacing the synthetic source.

### What the app actually reports
The mobile app sends a **role** (`designation`) and the user's **Salesforce dealership account + that account's billing address**. That is the whole organisational model.

- `data/roleTaxonomy.js` — closed `ROLES` list mirroring the app's own `getUserRole()` ladder. `validators/ingestValidator.js` rejects any `designation` not in it, so a new app-side role must land here *before* the app ships it. Replaced a former `geoTaxonomy.js` Zone→State→AO→Dealer→Branch→TM hierarchy that only ever held seeded values (see `scripts/drop-geo-fields.js`).
- `data/dealerTaxonomy.js` — dealership normalization. Geography means **"users attached to a dealership billed in <place>"**, never user location; describe it that way in UI copy and aggregations. Deliberately *not* enum-validated (dealer names/cities/categories are open Salesforce sets); `normalizeDealer()` accepts flat camelCase, nested `dealer`, and raw `account_name`/`billing_state` shapes, title-cases places at write time so `$distinct` filter lists stay clean, and only `category === 'DEALER'` reaches the geographic rollups. AO and TM are not modelled — that data does not exist.
- User classification thresholds (`loginDays`): `> 20` frequent, `5–20` occasional, `1–4` low, `0` none. `classify()` in `roleService.js` is shared by the table, export, and dealer rollups — keep the Mongo `$cond` accumulators in `dealerService.js` in step with it.

### Backend — `server/`
Layered **routes → controllers → services → models**. Controllers are thin (`try/catch → next(err)`, then `res.success(data, status, meta)`); all business logic and aggregation pipelines live in services.

| Layer | Location |
|---|---|
| Entry point | `index.js` |
| Config / env | `config/env.js` |
| DB connection | `database/connection.js` |
| Models (6) | `models/` |
| Domain taxonomies / synthetic generator | `data/` |
| Business logic | `services/` |
| HTTP handlers | `controllers/` |
| Route mounts | `routes/index.js` |
| Validation | `validators/ingestValidator.js` (express-validator; ingest only) |
| Shared utils | `utils/apiError.js`, `pagination.js`, `dateRange.js`, `eventName.js`, `jwt.js`, `logger.js` |
| Middleware | `auth.js` (`authenticate`), `errorHandler.js`, `responseFormatter.js`, `rateLimiter.js`, `validate.js` |
| Ops scripts | `scripts/` |

**Boot** (`index.js`): connect Mongo → `ensureAdminSeed()` (idempotently creates the single admin from `ADMIN_USERNAME`/`ADMIN_PASSWORD`) → listen. `app.set('trust proxy', 1)` — one hop only, because nginx terminates TLS and both rate limiting and logs key off `req.ip`. Express serves `client/dist` statically with a `/{*path}` SPA fallback, so **a client change is only live in production after `npm run build`**.

**Response shape** — via `res.success()` / `res.paginated()` from `responseFormatter`:
```json
{ "success": true, "data": {}, "meta": { "page": 1, "limit": 20, "total": 500, "totalPages": 25 } }
```
**Error shape** — thrown as `ApiError`, which maps status → code:
```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "..." } }
```

**Shared query conventions**: `buildDateFilter(query, field)` turns `startDate`/`endDate` into a UTC day-bounded Mongo range (`{}` when absent); `getPagination(query)` clamps `limit` to 100 (default 20) and `buildMeta()` produces the `meta` block.

**Rate limiting**: `ingestLimiter` (`RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS`, default 200/min) on POST ingestion; `dashboardLimiter` (300/min) on every GET router. The ingest limiter keys on **`userId` from the request body** (falling back to IP) — behind nginx the whole device fleet shares one address and was exhausting a single bucket. For `/ingest/events` the key comes from the first event in the batch. That code runs before validation, so treat the body as unverified there.

**Auth** — dashboard is admin-only (JWT bearer). `/ingest/*` and `/auth/*` are public; **every other router is wrapped in `authenticate`** in `routes/index.js`, which sets `req.admin`. Credentials live in the `admins` collection (`models/Admin.js`, bcrypt `password` with `select:false`, `comparePassword()`). Tokens are signed/verified in `utils/jwt.js`. Login returns the same error for unknown user and bad password, by design.

**Event ingestion**: batches of 1–50 events, 2MB body cap. `utils/eventName.js` `normalizeEventIdentity()` runs at write time — it strips query strings from `eventName`, strips scheme+host from `apiEndpoint`, truncates at 200 chars, and drops `apiEndpoint` when it merely repeats the name. The SDK sends full request URLs as event names, which cost ~100MB of text plus ~80MB of index on a 512MB tier. Don't bypass it.

**Event types** are a closed enum in `models/Event.js` (`EVENT_TYPES`): generic types plus the Mahindra feature-usage lifecycle (`enquiry_creation`, `enquiry_review`, `enquiry_followup`, `product_guide`, `village_visit`, `booking`, `delivery`) that `featureUsageService` aggregates. Adding one means editing the enum — `validators/ingestValidator.js` derives its check from it.

**Excel export**: `/dashboard/export/users` streams an `exceljs` workbook — the only non-JSON response in the API.

**Docs**: `docs/postman/API_DOCUMENTATION.md` + `AppAnalytics.postman_collection.json` are hand-maintained — update them when ingest or dashboard endpoints change. `docs/APP_INTEGRATION_FEATURE_USAGE.md` is the mobile-team integration contract and records the known app-side bugs blocking real feature-usage data (events POSTed as a single object instead of an array with `eventId`; `identify` omitting `designation`; booking/follow-up sent as `custom`).

### MongoDB collections
1. `users` — one doc per mobile user: lifetime stats, `designation`, denormalized `dealer` subdocument, and login-activity fields (`loginDays`, `totalLogins`, `lastLoginAt`) that drive classification. Dealer data is denormalized rather than joined because every report groups users.
2. `sessions` — one doc per app session; duration, `screensVisited[]`
3. `events` — high volume; compound indexes on `{userId,timestamp}`, `{sessionId,timestamp}`, `{eventType,timestamp}`, `{screenName,timestamp}`, `{eventName,timestamp}`
4. `screen_visits` — denormalized from events for fast screen aggregations
5. `analytics_summaries` — pre-aggregated snapshots; **written only by the seeder, read by no endpoint**
6. `admins` — the single dashboard login

Indexes are pruned deliberately (single-field indexes covered by a compound prefix were dropped). Adding `index: true` to a model resurrects them on the next boot via Mongoose `autoIndex` — check `scripts/drop-redundant-indexes.js` before adding one.

### API base: `/api/v1`
| Prefix | Endpoints |
|---|---|
| `/ingest/*` | `identify`, `login`, `session/start`, `session/end`, `events`, `screen` (public, POST) |
| `/auth/*` | `POST login` (public), `GET me`, `POST logout` |
| `/dashboard/*` | `summary`, `graphs`, `realtime`, `devices`, `app-versions`, `funnel`, `retention-curve`, `session-overview`, `performance`, `geo`; usage: `usage/filters`, `screen-usage`, `module-usage`, `workflow-break`, `role-usage`; role: `role-analytics/filters|summary|users`, `role-analytics`, `user-classification`, `export/users`; dealer: `dealer-analytics/filters|summary`, `dealer-analytics`, `geography`; `feature-usage` |
| `/users/*` | `top`, `active`, `stats`, `demographics`, list, `:userId`, `:userId/timeline`, `:userId/sessions` |
| `/sessions/*` | `stats`, `hourly`, `trend`, list, `:sessionId` |
| `/events/*` | `distribution`, `top`, `stats`, `trend`, `summary`, list |
| `/screens/*` | `analytics`, `top`, `:screenName/trend` |
| `/analytics/*` | `retention`, `usage`, `engagement` |
| `/reports/*` | `daily`, `weekly`, `monthly` |
| `/health` | unauthenticated liveness check |

### Frontend — `client/src/`
React 19 + Vite 8. UI: **shadcn/ui** (`style: base-lyra`, see `components.json`) on **Tailwind CSS v4** + **Base UI** primitives — *not* Ant Design, whatever older comments say. Icons: **Phosphor** in features/pages (`iconLibrary: phosphor`); `layouts/` still uses `lucide-react`. Charts: **Recharts** wrapped in shadcn's `ChartContainer`/`ChartTooltip` (`components/ui/chart.jsx`). Data: **TanStack Query** (`retry: 1`, `refetchOnWindowFocus: false`). Routing: **React Router v7**.

Path alias `@/*` → `src/*` — defined in both `vite.config.js` and `jsconfig.json`; keep them in sync. New shadcn primitives come from the `shadcn` CLI reading `components.json`; hand-rolled components live one level up.

| Folder | Purpose |
|---|---|
| `api/` | `axiosInstance.js` + one file per backend domain (dashboard, users, sessions, events, screens, analytics, usage, auth, role, dealer, featureUsage) |
| `components/ui/` | Generated shadcn primitives — treat as vendored; regenerate rather than hand-edit |
| `components/cards`, `charts`, `tables`, `common`, `auth` | `KPICard`/`StatCard`; `Area/Bar/Line/Pie/Funnel/DonutStat/MiniSparkline`; `DataTable` (client-side sort, server pagination via `meta`/`onPageChange`); filters, pickers, `UserSwitcher`, `ScopedUserBanner`; `ProtectedRoute` |
| `context/` | `ThemeContext`, `FiltersContext`, `AuthContext` |
| `hooks/` | One file per domain wrapping TanStack Query, plus `useUsageFilters`, `useDebounce`, `use-mobile` |
| `layouts/` | `DashboardLayout` (`SidebarProvider`/`TooltipProvider`), `Sidebar`, `Header` |
| `pages/` | One `index.jsx` per route |
| `constants/` | `routes.js`, `eventTypes.js`, `filterMeta.js` |
| `lib/utils.js` | `cn()` (clsx + tailwind-merge) |
| `utils/` | `formatters.js`, `dateHelpers.js` |

**Provider order** (`App.jsx`): `QueryClientProvider → ThemeProvider → AuthProvider → FiltersProvider → Router`.

**Global filters**: `FiltersContext` owns `dateRange` (dayjs pair, default last 30 days), `platform`, and `selectedUserId` (persisted to `localStorage`). Spread **`queryParams`** — `{startDate, endDate, ...(userId), ...(platform)}` — into API calls; it is the single source of truth, and the sidebar's user selection scopes the whole app through it (`dateParams` is the date-only subset). Several services branch on `userId` to return single-user KPIs.

**Theme**: `ThemeContext` toggles a `dark` class on `document.documentElement`; Tailwind `dark:` variants + CSS custom properties in `App.css` do the rest (no `ConfigProvider`). Persisted to `localStorage`.

**Realtime page**: polls `/dashboard/realtime` and `/users/active` every 10–15s via TanStack Query `refetchInterval`.

**Client auth**: `AuthContext` + `axiosInstance` helpers store the JWT under `auth_token` in `localStorage` or `sessionStorage` (`remember` flag). A request interceptor attaches `Authorization: Bearer <token>`; a response interceptor unwraps `response.data`, and on `401` clears the token and redirects to `/login`. Everything except `/login` sits behind `ProtectedRoute`.
