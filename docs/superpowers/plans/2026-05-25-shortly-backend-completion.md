# Shortly Backend Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all backend issues across api-service, ticket-service, and redirection-service — 35+ items across 6 phases covering bugs, security, caching, infra, code quality, and tests.

**Architecture:** 3 Hono/Node.js microservices sharing a PostgreSQL database with Redis caching. API service handles CRUD, ticket service handles ID generation, redirection service handles short URL resolution. Services communicate over HTTP.

**Tech Stack:** Hono 4.x, TypeScript, PostgreSQL, Redis (Upstash/ioredis), Argon2, OpenTelemetry, Docker, Vitest

---

## Phase 1: Critical Bug Fixes

### Task 1.1: Fix missing `await` on `argon2.verify()` — BOTH services

**Files:**
- Modify: `api-service/src/api/v1/utils/password-manager.ts:30`
- Modify: `redirection-service/src/api/v1/utils/password-manager.ts:30`

- [ ] **Fix api-service password-manager.ts**

Edit line 30 from:
```typescript
const isValid = verify(hashedText, plainText)
```
to:
```typescript
const isValid = await verify(hashedText, plainText)
```

- [ ] **Fix redirection-service password-manager.ts**

Same edit on line 30.

- [ ] **Verify no other missing awaits on argon2**

Run: `cd /home/cur10sdev/Desktop/coding/tinkering/shortly && grep -rn "verify(" api-service/src/ redirection-service/src/ | grep -v "await" | grep -v "import"` — should return no results.

### Task 1.2: Fix healthchecks — replace `ping` with `wget` in ALL docker-compose files

**Files:** 7 docker-compose files
- `docker-compose.yml` (3 healthchecks, lines 18-20, 42-44, 66-68)
- `api-service/docker/production/docker-compose.yml` (lines 17-19)
- `api-service/docker/development/docker-compose.yml` (lines 23-25)
- `ticket-service/docker/production/docker-compose.yml` (lines 17-19)
- `ticket-service/docker/development/docker-compose.yml` (lines 23-25)
- `redirection-service/docker/production/docker-compose.yml` (lines 17-19)
- `redirection-service/docker/development/docker-compose.yml` (lines 23-25)

Each occurrence needs the `ping` test replaced with:
```yaml
          "CMD",
          "wget",
          "--no-verbose",
          "--tries=1",
          "--spider",
          "http://localhost:${APP_PORT:-8080}/api/v1/health-check",
```

**Note:** The `APP_PORT` default varies by service (5000, 8000, 8080). Preserve the existing default for each.

- [ ] **Fix root docker-compose.yml** — all 3 healthchecks
- [ ] **Fix api-service/production/docker-compose.yml**
- [ ] **Fix api-service/development/docker-compose.yml**
- [ ] **Fix ticket-service/production/docker-compose.yml**
- [ ] **Fix ticket-service/development/docker-compose.yml**
- [ ] **Fix redirection-service/production/docker-compose.yml**
- [ ] **Fix redirection-service/development/docker-compose.yml**

### Task 1.3: Fix `post_start` in root docker-compose.yml

**File:** `docker-compose.yml:73-77`

`post_start` is not a valid Docker Compose key. Replace it with a proper approach: add a script that runs after container start, or use `command` override. Best approach: replace `post_start` with an init container approach or move better-auth commands into the Dockerfile's CMD.

Replace lines 73-77 with:
```yaml
    command: >
      sh -c "
      npx --yes @better-auth/cli generate --config ./dist/src/api/v1/lib/auth.js --yes &&
      npx --yes @better-auth/cli migrate --config ./dist/src/api/v1/lib/auth.js --yes &&
      npm run start:docker
      "
```

This runs better-auth generate + migrate before starting the server.

- [ ] **Fix post_start in docker-compose.yml**

### Task 1.4: Fix wrong env var names

**Files:**
- `redirection-service/.env` — `SHORT_URL_BASE_URL` → `SHORTLY_BASE_URL`, `SHORT_URL_API_SERVICE_BASE_URL` → `SHORTLY_API_SERVICE_BASE_URL`
- `ticket-service/.env` — `SHORT_URL_API_SERVICE_BASE_URL` → `SHORTLY_API_SERVICE_BASE_URL`
- `ticket-service/.env.dev` — `SHORT_URL_API_SERVICE_BASE_URL` → `SHORTLY_API_SERVICE_BASE_URL`

- [ ] **Fix redirection-service/.env** — rename env vars
- [ ] **Fix ticket-service/.env** — rename env var
- [ ] **Fix ticket-service/.env.dev** — rename env var

### Task 1.5: Fix `sucess` → `success` typos

**Files:**
- `api-service/src/api/v1/app.ts:71`
- `api-service/src/api/v1/short-url/routes/index.ts:128`
- `redirection-service/src/api/v1/app.ts:38`

- [ ] **Fix api-service/app.ts** — `sucess` → `success`
- [ ] **Fix api-service/short-url/routes/index.ts** — `sucess` → `success`
- [ ] **Fix redirection-service/app.ts** — `sucess` → `success`

---

## Phase 2: Auth & Security

### Task 2.1: Ticket service auth — shared API key

**Files:**
- Create: `ticket-service/src/api/v1/middleware/auth.ts`
- Modify: `ticket-service/src/api/v1/app.ts`
- Modify: `ticket-service/src/api/v1/utils/env.ts`
- Modify: `api-service/src/api/v1/external/ticket-service/index.ts`
- Modify: `api-service/src/api/v1/utils/env.ts`

**Approach:** Use a shared API key (set via `TICKET_API_KEY` env var) that the API service sends as a header (`X-API-Key`). The ticket service validates this header in middleware.

- [ ] **Add `TICKET_API_KEY` to ticket-service env schema** (`ticket-service/src/api/v1/utils/env.ts`)

```typescript
TICKET_API_KEY: z.string().min(32),
```

- [ ] **Create auth middleware** (`ticket-service/src/api/v1/middleware/auth.ts`)

```typescript
import { createMiddleware } from 'hono/factory'
import { parsedEnv } from '../utils/env.js'

export const authMiddleware = createMiddleware(async (c, next) => {
  const apiKey = c.req.header('X-API-Key')
  if (!apiKey || apiKey !== parsedEnv.TICKET_API_KEY) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }
  await next()
})
```

- [ ] **Apply auth middleware to ticket routes** (`ticket-service/src/api/v1/app.ts`)

```typescript
import { authMiddleware } from './middleware/auth.js'
// ...
app.use('/api/v1/tickets/*', authMiddleware)
```

- [ ] **Add `TICKET_API_KEY` to API service env schema** (`api-service/src/api/v1/utils/env.ts`)

```typescript
TICKET_API_KEY: z.string().min(32),
```

- [ ] **Add `X-API-Key` header to ticket service client** (`api-service/src/api/v1/external/ticket-service/index.ts`)

In the fetch call on line ~35-45, add:
```typescript
headers: {
  'Content-Type': 'application/json',
  'X-API-Key': parsedEnv.TICKET_API_KEY,
},
```

- [ ] **Update env files** — Add `TICKET_API_KEY` to `.env.ticket` and `.env.api`

### Task 2.2: Fix password hash failure silently unprotecting link

**File:** `api-service/src/api/v1/short-url/routes/index.ts:42-52`

When `hashPassword(password)` returns `null`, the code sets `password: null` which removes password protection. Add a check to abort the request if hashing fails.

- [ ] **Fix null hash handling in create route**

After line 47 (`finalPassword`), add:
```typescript
if (password && !finalPassword) {
  throw new HTTPException(500, { message: 'Failed to hash password' })
}
```

- [ ] **Fix null hash handling in update route** (same pattern around line 95)

### Task 2.3: Fix CORS missing PATCH/DELETE methods

**File:** `api-service/src/api/v1/app.ts:25`

Change:
```typescript
allowMethods: ['POST', 'GET', 'OPTIONS'],
```
to:
```typescript
allowMethods: ['POST', 'GET', 'PATCH', 'DELETE', 'OPTIONS'],
```

- [ ] **Add PATCH/DELETE to CORS allowMethods**

### Task 2.4: Clean secrets from env files

**Files:**
- `envs/.env.api` — contains live OAuth keys, better-auth secret, Neon credentials
- `envs/.env.redirection` — contains Neon credentials
- `envs/.env.ticket` — contains Neon credentials
- `redirection-service/.env` — contains Neon credentials, Redis URL with password
- `api-service/.env` — contains secrets
- `api-service/.env.dev` — contains secrets
- `ticket-service/.env` — contains secrets
- `ticket-service/.env.dev` — contains secrets

Create `.env.sample` files as replacements, strip secrets from tracked env files and add to `.gitignore`.

- [ ] **Create `envs/.env.sample`** — placeholder values only
- [ ] **Create `.env.sample` for each service** (api-service, ticket-service, redirection-service) — placeholder values only
- [ ] **Add `.env*` to `.gitignore`** (except `.env.sample`)
- [ ] **Remove live secrets from all tracked env files** — replace with placeholders like `your-key-here`

### Task 2.5: Add fetch timeout to ticket service client

**File:** `api-service/src/api/v1/external/ticket-service/index.ts`

- [ ] **Add AbortController timeout** — wrap the fetch call with a 5-second timeout:

```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 5000)

const response = await fetch(`${parsedEnv.SHORTLY_TICKET_SERVICE_BASE_URL}/api/v1/tickets/generate`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': parsedEnv.TICKET_API_KEY,
  },
  body: JSON.stringify({ database_id: 1 }),
  signal: controller.signal,
})
clearTimeout(timeoutId)
```

### Task 2.6: Add basic rate limiting

**Files to modify:**
- `api-service/src/api/v1/app.ts` — add rate limiting middleware
- `redirection-service/src/api/v1/app.ts` — add rate limiting middleware

Since they don't have a rate limiting library, add a simple in-memory rate limiter middleware.

- [ ] **Create simple rate limiter** `api-service/src/api/v1/middleware/rate-limiter.ts`:

```typescript
import { createMiddleware } from 'hono/factory'
import logger from '../utils/logger.js'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

const cleanup = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 60000)
cleanup.unref()

export const rateLimiter = (maxRequests: number, windowMs: number) =>
  createMiddleware(async (c, next) => {
    const ip = c.req.header('x-forwarded-for') || 'unknown'
    const now = Date.now()
    const key = `${ip}:${c.req.path}`

    let entry = store.get(key)
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs }
      store.set(key, entry)
    }

    entry.count++
    if (entry.count > maxRequests) {
      logger.warn(`Rate limit exceeded for ${key}`)
      return c.json({ success: false, message: 'Too many requests' }, 429)
    }

    await next()
  })
```

- [ ] **Apply to API service POST routes** — wrap `POST /api/v1/short-url/create` with rate limiter
- [ ] **Apply to redirection service POST `/password`** — wrap with rate limiter

---

## Phase 3: Cache & Performance

### Task 3.1: Add `deleteCache` to Redis module

**File:** `redirection-service/src/api/v1/lib/redis.ts`

- [ ] **Add deleteCache function**:

```typescript
export const deleteCache = async (key: string): Promise<void> => {
  try {
    await redis.del(key)
  } catch (error) {
    logger.error('REDIS - Error deleting cache', error)
  }
}
```

### Task 3.2: Cache invalidation on link update/delete

**Files:**
- Modify: `api-service/src/api/v1/short-url/routes/index.ts`
- Modify: `api-service/src/api/v1/utils/env.ts` (add redirection service URL)

- [ ] **Add `SHORTLY_REDIRECTION_SERVICE_BASE_URL` to API service env schema**
- [ ] **Add invalidation call after link update** in PATCH handler — send HTTP request to redirection service to purge cache
- [ ] **Add invalidation call after link delete** in DELETE handler
- [ ] **Create cache invalidation endpoint in redirection service** — `POST /api/v1/short-url/invalidate-cache` that accepts `short_code` and deletes from Redis
- [ ] **Add auth on invalidation endpoint** (reuse shared API key pattern)

### Task 3.3: Fix cache ordering in redirection password route

**File:** `redirection-service/src/api/v1/short-url/routes/index.tsx:97`

Move the `setCache` call to AFTER the password is successfully verified (after line 102, inside the success block), not before.

- [ ] **Reorder cache set in password route**

### Task 3.4: Fire-and-forget cache after redirect

**File:** `redirection-service/src/api/v1/short-url/routes/index.tsx:51`

Change `await setCache(...)` to `setCache(...).catch(() => {})` so the redirect (302) is not blocked by Redis write latency.

- [ ] **Remove await from setCache in GET redirect handler**

---

## Phase 4: Infrastructure & Config

### Task 4.1: Fix ALL env var inconsistencies across env files

**Files:**
- `ticket-service/.env` — align var names with schema
- `ticket-service/.env.dev` — align var names with schema
- `api-service/.env` — check for correct var names
- `api-service/.env.dev` — check for correct var names
- `redirection-service/.env` — already fixed in Task 1.4
- `envs/.env.api` — check var names
- `envs/.env.redirection` — check var names
- `envs/.env.ticket` — check var names

Each service's env schema (`src/api/v1/utils/env.ts`) defines the canonical names. Env files must match.

- [ ] **Audit and fix all env files** — ensure every var matches the schema it's consumed by

### Task 4.2: Add `.env.sample` files

- [ ] **Create `api-service/.env.sample`** — all vars with placeholder values, no secrets
- [ ] **Create `ticket-service/.env.sample`**
- [ ] **Create `redirection-service/.env.sample`**
- [ ] **Create `envs/.env.sample`**

### Task 4.3: Fix `dumb-init` in Dockerfiles

**Files:**
- `api-service/docker/production/Dockerfile`
- `ticket-service/docker/production/Dockerfile`
- `redirection-service/docker/production/Dockerfile`

- [ ] **Add ENTRYPOINT before CMD in each Dockerfile**:

```dockerfile
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
```

### Task 4.4: Fix trigger name in init.sql

**File:** `scripts/db/init.sql`

- [ ] **Rename trigger** `update_your_table_modtime` → `update_links_modtime`
- [ ] **Same fix in `api-service/scripts/db/init.sql`**

### Task 4.5: Move better-auth CLI to Dockerfile CMD

**File:** `api-service/docker/production/Dockerfile`

The current `RUN` commands for better-auth run at build time with no env vars. Move them to runtime via the CMD or entrypoint script.

- [ ] **Fix Dockerfile** — change CMD to run generate + migrate before start:

```dockerfile
CMD ["sh", "-c", "npx --yes @better-auth/cli generate --config ./dist/src/api/v1/lib/auth.js --yes && npx --yes @better-auth/cli migrate --config ./dist/src/api/v1/lib/auth.js --yes && npm run start:docker"]
```

### Task 4.6: Add notFound/onError handlers to ticket service

**File:** `ticket-service/src/api/v1/app.ts`

- [ ] **Add notFound handler**:

```typescript
app.notFound((c) => {
  return c.json({ success: false, message: 'Not Found' }, 404)
})
```

- [ ] **Add onError handler**:

```typescript
app.onError((err, c) => {
  logger.error('TICKET SERVICE - Unhandled error', err)
  return c.json({ success: false, message: 'Internal Server Error' }, 500)
})
```

### Task 4.7: Fix short URL generation to point to redirection service

**File:** `api-service/src/api/v1/short-url/routes/index.ts:68`

Change from `parsedEnv.SHORTLY_BASE_URL` (which is the API service URL) to use the redirection service URL.

- [ ] **Add `SHORTLY_REDIRECTION_SERVICE_BASE_URL` to env schema** (if not added in Task 3.2)
- [ ] **Fix short_url generation** — use the redirection service base URL

### Task 4.8: Remove unnecessary CORS/CSRF from redirection service HTML pages

**File:** `redirection-service/src/index.ts:17-32`

The redirection service serves HTML pages (not an API consumed cross-origin). Remove CORS and CSRF middleware.

- [ ] **Remove cors() and csrf() middleware** from redirection service, or scope them only to API routes

---

## Phase 5: Code Quality

### Task 5.1: Fix `SERIVCE_ID` → `SERVICE_ID` typo

**Files (8 occurrences):**
- `api-service/src/api/v1/utils/env.ts:13` — schema
- `redirection-service/src/api/v1/utils/env.ts:11` — schema
- `api-service/.env` (if present)
- `redirection-service/.env`
- `envs/.env.api`
- `envs/.env.redirection`
- `api-service/src/api/v1/external/ticket-service/index.ts:30-31`
- Any other .env files

- [ ] **Fix all 8 occurrences** — `SERIVCE_ID` → `SERVICE_ID`

### Task 5.2: Fix `expires_at` type

**File:** `redirection-service/src/api/v1/short-url/types.ts:6`

Change `EpochTimeStamp | null` to `Date | string | null`.

- [ ] **Fix expires_at type**

### Task 5.3: Add URL validation to CORS_ORIGIN schema

**File:** `api-service/src/api/v1/utils/env.ts:15`

Change `z.string().min(1)` to `z.string().url()`.

- [ ] **Fix CORS_ORIGIN validation**

### Task 5.4: Fix tsconfig files

**Files:**
- `api-service/tsconfig.json`
- `ticket-service/tsconfig.json`
- `redirection-service/tsconfig.json`

- [ ] **Add `rootDir`** — set to `"./src"`
- [ ] **Add `sourceMap`** — set to `true`

### Task 5.5: Add missing @types/pg

- [ ] **Add `@types/pg` to api-service and redirection-service**:

```bash
cd api-service && npm install --save-dev @types/pg
cd ../redirection-service && npm install --save-dev @types/pg
```

### Task 5.6: Standardize dependency versions

Use consistent versions across services:
- Hono: `^4.11.1`
- Zod: `^4.2.1`
- @types/node: use a shared version

- [ ] **Update package.json files** — standardize versions

### Task 5.7: Fix DB schema issues

**File:** `scripts/db/init.sql`

- [ ] **Remove redundant `short_code` index** — `UNIQUE` constraint already creates one
- [ ] **Add composite index for soft-delete**:

```sql
CREATE INDEX IF NOT EXISTS idx_links_short_code_deleted_at ON "links" ("short_code", "deleted_at");
```

- [ ] **Add `IF NOT EXISTS`** to CREATE TABLE and CREATE INDEX statements
- [ ] **Same fixes in `api-service/scripts/db/init.sql`**

---

## Phase 6: Testing

### Task 6.1: Add vitest configs

**Directory (all 3 services):**

- [ ] **Create `api-service/vitest.config.ts`**:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
})
```

- [ ] **Create `ticket-service/vitest.config.ts`** (same content)
- [ ] **Create `redirection-service/vitest.config.ts`** (same content)

### Task 6.2: Write unit tests for api-service

- [ ] **Test password-manager.ts** — hash and verify functions
- [ ] **Test env validation** — valid and invalid env var combinations

### Task 6.3: Write unit tests for ticket-service

- [ ] **Test ticket generation logic** — mock DB calls, verify correct SQL
- [ ] **Test auth middleware** — valid and invalid API keys

### Task 6.4: Write unit tests for redirection-service

- [ ] **Test password-manager.ts** — hash and verify functions
- [ ] **Test cache functions** — set, get, delete (mock Redis)
