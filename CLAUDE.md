# CLAUDE.md — HiYrNow

Place this file at the repo root (`project_gcp/CLAUDE.md`). Claude Code reads it automatically on every session.

---

## 1. What this project is

HiYrNow is a job portal. Two halves in one repo:

| Path | What it is |
|---|---|
| `app/` | Angular 17 frontend. 118 components. PWA. Tailwind + Bootstrap + Angular Material (all three, yes). |
| `job-portal-node-server-master/` | Node + Express backend. MongoDB via Mongoose. Redis. BullMQ workers. |

Deployed to GCP (Cloud Run) via `cloudbuild.yaml` / `deploy.sh`. Frontend also has Firebase config.

Backend default port: 5500 (`config.port`, falls back to 3000 in code). Frontend dev: 4200.

---

## 2. Backend architecture — read this before writing code

### 2.1 There is no router layer

There are **no** Express `Router` files. Every service file is a function that takes `app` and attaches routes directly:

```js
// services/job-posting.service.server.js
module.exports = function (app) {
  app.get('/api/jobPosting/:jobPostingId', findJobPostingById);
  ...
}
```

`server.js` calls each one inside `init()` after session middleware is mounted. **If a service is not listed in `server.js`, its routes do not exist.** Check that list before assuming an endpoint is live.

### 2.2 Dead / duplicated services — IMPORTANT

These files exist but are **NOT registered** in `server.js`:

- `services/job-posting.service.optimized.js` — has proper auth guards
- `services/job-application.service.optimized.js` — has proper auth guards
- `services/dashboard.service.server.js` — superseded by `dashboard.service.enhanced.js`
- `services/credit-points.service.server.js` — exports no routes

The `.optimized.js` files are a secured rewrite that was never wired in. The **live** `job-posting.service.server.js` and `job-application.service.server.js` have **zero auth middleware**. Do not assume a route is protected because you saw a guard somewhere — grep `server.js` first.

### 2.3 Model layer convention

Every domain has two files under `models/<domain>/`:

- `<domain>.schema.server.js` — exports a raw Mongoose schema
- `<domain>.model.server.js` — calls `mongoose.model(...)` and exports the model plus helper functions (`findAllUsers`, `findAllJobPostings`, etc.)

Exceptions that break the convention (don't copy these patterns):
- `models/user/UserActivity.schema.server.js` — exports a **model**, not a schema, despite the filename
- `models/ai-analysis-result.*` — sits at the root of `models/`, not in a folder

Collections are pinned explicitly: `{ collection: 'User' }`, `{ collection: 'JobPosting' }`, etc. PascalCase collection names. Keep this.

### 2.4 Known bug

`server.js` `/sitemap.xml` requires `./models/job-posting.model.server`, `./models/user.model.server`, `./models/blog.model.server` — **none of these paths exist** (models live in subfolders). The route always throws and returns 500, silently. Fix the paths if you touch it.

---

## 3. Data model — current reality

### 3.1 Users

Single `User` collection for everyone. `role` is a plain `String` with no enum: `'Admin'`, `'JobSeeker'`, `'Recruiter'`.

There is **no organization / tenant / team concept anywhere.**

### 3.2 Recruiter shape

```
User (role: 'Recruiter')
  └── RecruiterDetail  (1:1, linked by RecruiterDetail.user -> User._id)
        ├── company: String          <-- a plain string, not a reference
        ├── teamMembers: [String]    <-- unused, plain strings
        ├── plan: ObjectId -> PricingPlan
        ├── planStartDate / planEndDate / billingCycle
        └── usage: { jobPostsThisCycle, aiJdThisCycle,
                     aiProfileAnalysisThisCycle, jobBoostsThisCycle,
                     candidateProfileCredits }
```

**Subscription and usage counters live on the individual recruiter, not on a company.**

`models/company/` exists but is a stub (`name, location, website, companySize`) and is **referenced by zero files**. It is dead code. Do not assume it is the org model.

### 3.3 Ownership of recruiter data

`JobPosting.user -> User._id` (the individual recruiter). Same pattern elsewhere. All recruiter-owned records point at a **person**, never at a company.

### 3.4 Activity data that already exists

- `UserActivity` (`models/user/UserActivity.schema.server.js`) — fields: `userId, user, activityType, timestamp, ipAddress, device`. Written in exactly one place: `user.service.server.js:324` (login). Read at `:1511`. No indexes defined.
- `AdminLog` (`models/admin-log/`) — `adminId, action, meta, ipAddress, userAgent, createdAt`. For admin actions only.

---

## 4. Auth — there are two parallel systems, and one of them is optional

### System A — `middleware/auth.js` + `middleware/rbac.js`
Session-based. `requireAuth`, `requireRole`, `requireAdmin`, `requireRecruiter`, `requireVerifiedRecruiter`, `requireOwnershipOrAdmin`. Reads `req.session.user`, sets `req.user`.

Used by: `user.service.server.js`, `queue.service.server.js`, `file-storage.service.server.js`, and the two dead `.optimized.js` files. **That's it.**

### System B — inline in `services/admin.service.server.js`
Its own private `requireAdmin` / `requireRoles(...)`, its own `req.session.admin` object, and an `ensureAdminSession()` that maps `User.role` to admin roles `'super-admin' | 'content-admin' | 'finance-admin' | 'ai-monitor'`.

So admin roles exist in two shapes that must be kept in sync by hand.

### Critical: `req.session.user` is a snapshot
The user object is copied into the session at login. Role/status changes do not take effect until the user logs in again. Any permission system built on session data inherits this. Either read permissions per-request from the DB (with a Redis cache) or add a `permissionsVersion` field and invalidate.

### Critical: session store silently degrades
`server.js` tries Redis, pings it, and on any failure **falls back to `MemoryStore` with only a `console.warn`**. On Cloud Run with more than one instance, MemoryStore means sessions break at random. Treat a MemoryStore fallback in production as a hard failure, not a warning.

Cookie: `name: 'sessionId'`, `httpOnly`, `secure: true`, `sameSite: 'none'`, `partitioned: true`, 24h, `rolling: true`.

### CORS
Hand-rolled in `server.js`. Allows any origin containing `localhost`, `hiyrnow.in`, `web.app`, or `firebaseapp.com` — substring match, not exact match. So `hiyrnow.in.evil.com` passes. Flag it; don't silently "fix" it without checking deploy domains.

---

## 5. Infrastructure

- `infra/cache.js` — Redis client (`redisClient`)
- `infra/cache-invalidation.js`
- `infra/outbox.js` + `models/outbox/` — transactional outbox pattern
- `infra/logger.js` — `requestIdMiddleware`, `logRequest`
- `infra/telemetry.js` — OpenTelemetry, initialized first in `server.js`, disable with `TELEMETRY_ENABLED=false`
- `infra/storage.js` — cloud file storage; GridFS bucket `profile-pictures` also exists (legacy, see `utils/migrate-gridfs-to-cloud.js`)
- `queues/index.js` + `workers/` — BullMQ: `email.worker.js`, `outbox.worker.js`, `resume-parsing.worker.js`, `ai-analysis.worker.js`, started via `workers/start-workers.js`
- `middleware/`: `error-handler.js` (global, mounted last), `cache.js`, `idempotency.js`, `metrics.js`, `validate.js`
- `utils/create-indexes.js` — index creation lives here, NOT in the schemas

Error response shape (follow it):
```json
{ "error": { "code": "FORBIDDEN", "message": "...", "requestId": "..." } }
```

---

## 6. Frontend

- Routes: `src/app/app.routing.ts`. Single guard: `src/app/auth.guard.ts`.
- Services: `src/app/services/*.service.ts` (one per backend domain, e.g. `admin.service.ts`, `recruiter-detail.service.ts`).
- Admin UI already exists as separate components: `admin`, `admin-dashboard`, `admin-users`, `admin-jobs`, `admin-plans`, `admin-referrals`, `admin-analytics`, `admin-blog`, `admin-settings`, `admin-credit-management`.
- Session cookies are cross-site (`sameSite: 'none'`), so all HTTP calls must send `withCredentials: true`.

---

## 7. Testing

- Jest. `tests/unit/` (2 files), `tests/integration/` (3 files). Coverage is thin.
- Playwright configured in `app/playwright.config.ts`.
- Swagger at `/api-docs` when the backend runs; config in `config/swagger.js`.

---

## 8. Rules for Claude Code in this repo

1. **Never assume a route is protected.** Grep `server.js` for the service, then read the actual route line.
2. **Never assume a model is used.** `Company` is dead. Grep before building on anything.
3. Match existing conventions: schema/model file split, `{ collection: 'PascalCase' }`, `module.exports = function (app) {...}`.
4. Indexes go in `utils/create-indexes.js`.
5. Any new collection that grows per-action (activity logs) needs an index plan **and** a retention plan before it ships.
6. Adding a field to a shared schema affects existing documents. State the backfill/migration plan.
7. Do not introduce a fourth role system. Reconcile with System A and System B first.
8. Plan before code. On multi-file changes, output the file list and the migration steps and stop for approval.
