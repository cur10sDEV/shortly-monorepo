# Database Seed Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Idempotent seeder that fills PostgreSQL + Elasticsearch with realistic demo data attached to the user's login account so the redesigned dashboard can be visually evaluated.

**Architecture:** Pure deterministic generator (seeded PRNG) produces link rows + enriched click docs; thin PG and ES modules persist them (direct `_bulk` writes, docs tagged `_seed: true` for idempotent cleanup); an entrypoint wires CLI args → wipe → generate → insert → verify → optional live-pipeline smoke.

**Tech Stack:** TypeScript + tsx (already devDep), `pg` Pool, `@elastic/elasticsearch` v9 (`helpers.bulk`), argon2 via existing `hashPassword()`.

**Spec:** `docs/superpowers/specs/2026-08-25-db-seed-script-design.md`
All work happens in `api-service/`. Env loaded via node `--env-file=./.env.dev` (same as `npm run dev`). Do NOT import `src/api/v1/db/index.ts` or `utils/env.ts` from seed code — they demand the full app env and connect at import time; the seed modules own their minimal clients.

---

### Task 1: Pure generator — links, clicks, PRNG (TDD)

**Files:**
- Create: `api-service/scripts/seed/generator.ts`
- Test: `api-service/scripts/seed/generator.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// api-service/scripts/seed/generator.test.ts
import { describe, expect, it } from 'vitest'
import {
  generateClickDocs,
  generateLinks,
  indexNameFor,
  mulberry32,
  UA_POOL,
  REFERRER_POOL,
  GEO_PAIRS,
} from './generator'

const NOW = new Date('2026-08-25T12:00:00.000Z')

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 100; i++) expect(a()).toBe(b())
  })
})

describe('generateLinks', () => {
  it('creates the requested count with exactly the 4 special states', () => {
    const links = generateLinks(mulberry32(7), 15, NOW)
    expect(links).toHaveLength(15)
    const states = links.map((l) => l.state)
    expect(states.filter((s) => s === 'active')).toHaveLength(11)
    expect(states.filter((s) => s === 'expiring_soon')).toHaveLength(1)
    expect(states.filter((s) => s === 'expired')).toHaveLength(1)
    expect(states.filter((s) => s === 'deleted')).toHaveLength(1)
    expect(states.filter((s) => s === 'password')).toHaveLength(1)
  })

  it('gives every link a unique seed-prefixed code', () => {
    const links = generateLinks(mulberry32(7), 15, NOW)
    const codes = links.map((l) => l.short_code)
    expect(new Set(codes).size).toBe(15)
    codes.forEach((c) => expect(c.startsWith('seed')).toBe(true))
  })

  it('sets expiry/deletion dates consistently with state', () => {
    const links = generateLinks(mulberry32(7), 15, NOW)
    for (const l of links) {
      expect(l.created_at.getTime()).toBeLessThanOrEqual(NOW.getTime())
      if (l.state === 'expiring_soon') {
        expect(l.expires_at!.getTime()).toBeGreaterThan(NOW.getTime())
      }
      if (l.state === 'expired') {
        expect(l.expires_at!.getTime()).toBeLessThan(NOW.getTime())
      }
      if (l.state === 'deleted') {
        expect(l.deleted_at).not.toBeNull()
      }
      if (l.state === 'active' || l.state === 'password') {
        expect(l.expires_at).toBeNull()
        expect(l.deleted_at).toBeNull()
      }
    }
  })
})

describe('indexNameFor', () => {
  it('routes a timestamp to its UTC daily index', () => {
    expect(indexNameFor(new Date('2026-03-05T23:59:59Z'), 'clicks')).toBe('clicks-2026.03.05')
    expect(indexNameFor(new Date('2026-01-01T00:00:00Z'), 'shortly-clicks')).toBe(
      'shortly-clicks-2026.01.01',
    )
  })
})

describe('generateClickDocs', () => {
  const OWNER = 'user_123'
  const links = generateLinks(mulberry32(7), 15, NOW)
  const docs = generateClickDocs(mulberry32(9), links, OWNER, 90, NOW)

  it('produces a medium-sized corpus', () => {
    expect(docs.length).toBeGreaterThan(10_000)
    expect(docs.length).toBeLessThan(60_000)
  })

  it('matches the EnrichedClickEvent contract plus _seed', () => {
    const EXPECTED_KEYS = [
      'link_id',
      'link_owner_id',
      'ip',
      'user_agent',
      'referrer',
      'timestamp',
      'country',
      'city',
      'browser',
      'os',
      'device_type',
      'is_unique',
      '_seed',
    ].sort()
    for (const d of docs.slice(0, 500)) {
      expect(Object.keys(d).sort()).toEqual(EXPECTED_KEYS)
      expect(d._seed).toBe(true)
      expect(d.link_owner_id).toBe(OWNER)
    }
  })

  it('never emits clicks before a link was created or after it died', () => {
    const byCode = new Map(links.map((l) => [l.short_code, l]))
    // docs carry link_id which equals the index of the link in the array +1 (mirrors SERIAL ids)
    for (const d of docs) {
      const link = links[d.link_id - 1]
      expect(link).toBeDefined()
      const t = new Date(d.timestamp).getTime()
      expect(t).toBeGreaterThanOrEqual(link.created_at.getTime())
      const dead = link.deleted_at ?? link.expires_at
      if (dead && link.state !== 'expiring_soon') expect(t).toBeLessThan(dead.getTime())
    }
    void byCode
  })

  it('keeps is_unique between 55% and 75%', () => {
    const uniques = docs.filter((d) => d.is_unique).length
    const ratio = uniques / docs.length
    expect(ratio).toBeGreaterThan(0.55)
    expect(ratio).toBeLessThan(0.75)
  })

  it('draws referrers, UAs and geo from the defined pools', () => {
    const refSet = new Set(REFERRER_POOL)
    const uaSet = new Set(UA_POOL)
    const geoSet = new Set(GEO_PAIRS.map((g) => `${g.country}|${g.city}`))
    for (const d of docs.slice(0, 2000)) {
      expect(refSet.has(d.referrer)).toBe(true)
      expect(uaSet.has(d.user_agent)).toBe(true)
      expect(geoSet.has(`${d.country}|${d.city}`)).toBe(true)
      expect(['desktop', 'mobile', 'tablet']).toContain(d.device_type)
    }
  })

  it('is deterministic for the same seed', () => {
    const again = generateClickDocs(mulberry32(9), links, OWNER, 90, NOW)
    expect(again.length).toBe(docs.length)
    expect(again[0]).toEqual(docs[0])
    expect(again[docs.length - 1]).toEqual(docs[docs.length - 1])
  })
})
```

Note on `link_id`: docs use `arrayIndex + startId` because real PG rows get SERIAL ids. The test exercises the default `startId = 1`, so `links[d.link_id - 1]` resolves correctly there. The parameter exists for the entrypoint (Task 4), where actual PG ids are read back after insertion and may not start at 1 if other rows exist.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api-service && npx vitest run scripts/seed/generator.test.ts`
Expected: FAIL — cannot resolve `./generator`

- [ ] **Step 3: Implement the generator**

```ts
// api-service/scripts/seed/generator.ts
// Field contract mirrors analytics-consumer/src/types/index.ts (EnrichedClickEvent).
// Kept as a local literal to avoid a cross-package dependency; if the consumer
// type changes, update BOTH here and generator.test.ts EXPECTED_KEYS.

export type Archetype = 'steady' | 'growing' | 'viral-spike' | 'decaying' | 'weekend-heavy'

export type LinkState = 'active' | 'expiring_soon' | 'expired' | 'deleted' | 'password'

export interface SeedLink {
  short_code: string
  long_url: string
  state: LinkState
  archetype: Archetype
  created_at: Date
  expires_at: Date | null
  deleted_at: Date | null
}

export interface SeedClickDoc {
  link_id: number
  link_owner_id: string
  ip: string
  user_agent: string
  referrer: string
  timestamp: string
  country: string | null
  city: string | null
  browser: string | null
  os: string | null
  device_type: string | null
  is_unique: boolean
  _seed: boolean
}

/** Small fast seeded PRNG — deterministic across runs/platforms. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CODE_ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function indexNameFor(date: Date, prefix: string): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${prefix}-${y}.${m}.${d}`
}

const LONG_URLS = [
  'https://github.com/facebook/react',
  'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
  'https://news.ycombinator.com/',
  'https://en.wikipedia.org/wiki/URL_shortening',
  'https://www.theverge.com/tech',
  'https://css-tricks.com/snippets/css/complete-guide-grid/',
  'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs',
  'https://www.postgresql.org/docs/current/tutorial.html',
  'https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html',
  'https://kafka.apache.org/documentation/',
  'https://tailwindcss.com/docs/installation',
  'https://vitest.dev/guide/',
  'https://tanstack.com/query/latest',
  'https://reactrouter.com/start/mode/data',
  'https://better-auth.com/docs/introduction',
]

const ARCHETYPES: Archetype[] = ['steady', 'growing', 'viral-spike', 'decaying', 'weekend-heavy']

export function generateLinks(rand: () => number, count: number, now: Date): SeedLink[] {
  const links: SeedLink[] = []
  const usedCodes = new Set<string>()
  const DAY = 86_400_000

  for (let i = 0; i < count; i++) {
    // Last four slots get the special states (when there is room).
    const fromEnd = count - i
    const state: LinkState =
      count >= 5
        ? fromEnd === 4
          ? 'expiring_soon'
          : fromEnd === 3
            ? 'expired'
            : fromEnd === 2
              ? 'deleted'
              : fromEnd === 1
                ? 'password'
                : 'active'
        : 'active'

    let code = ''
    do {
      code = 'seed' + Array.from({ length: 5 }, () => CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)]).join('')
    } while (usedCodes.has(code))
    usedCodes.add(code)

    const ageDays = 2 + Math.floor(rand() * 84)
    const created = new Date(now.getTime() - ageDays * DAY)

    links.push({
      short_code: code,
      long_url: LONG_URLS[i % LONG_URLS.length],
      state,
      archetype: ARCHETYPES[i % ARCHETYPES.length],
      created_at: created,
      expires_at:
        state === 'expiring_soon'
          ? new Date(now.getTime() + 3 * DAY)
          : state === 'expired'
            ? new Date(now.getTime() - 5 * DAY)
            : null,
      deleted_at: state === 'deleted' ? new Date(now.getTime() - 2 * DAY) : null,
    })
  }
  return links
}

export const REFERRER_POOL = [
  'https://www.google.com/',
  '',
  'https://t.co/',
  'https://www.reddit.com/',
  'https://news.ycombinator.com/',
] as const
const REFERRER_WEIGHTS = [0.35, 0.2, 0.2, 0.15, 0.1]

export const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36 SamsungBrowser/26.0',
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.127 Mobile Safari/537.36',
  'Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
] as const

// device_type/browser/os are derived from the chosen UA the same way
// ua-parser (analytics-consumer/src/lib/parser.ts) derives them.
function deriveClient(uaIndex: number): { browser: string; os: string; device_type: string } {
  const table = [
    { browser: 'Chrome', os: 'Windows', device_type: 'desktop' },
    { browser: 'Chrome', os: 'Mac OS', device_type: 'desktop' },
    { browser: 'Safari', os: 'iOS', device_type: 'mobile' },
    { browser: 'Firefox', os: 'Ubuntu', device_type: 'desktop' },
    { browser: 'Edge', os: 'Windows', device_type: 'desktop' },
    { browser: 'Samsung Internet', os: 'Android', device_type: 'mobile' },
    { browser: 'Chrome Mobile', os: 'Android', device_type: 'mobile' },
    { browser: 'Safari', os: 'iOS', device_type: 'tablet' },
  ]
  return table[uaIndex]
}

export const GEO_PAIRS = [
  { country: 'United States', city: 'San Francisco' },
  { country: 'United States', city: 'New York' },
  { country: 'United Kingdom', city: 'London' },
  { country: 'Germany', city: 'Berlin' },
  { country: 'India', city: 'Bangalore' },
  { country: 'Japan', city: 'Tokyo' },
  { country: 'Brazil', city: 'Sao Paulo' },
  { country: 'Canada', city: 'Toronto' },
] as const

function pickWeighted<T>(items: readonly T[], weights: readonly number[], r: number): T {
  let acc = 0
  for (let i = 0; i < items.length; i++) {
    acc += weights[i]
    if (r <= acc) return items[i]
  }
  return items[items.length - 1]
}

// Business-hours-weighted hour of day (UTC-ish blend; realism over precision).
const HOUR_WEIGHTS = [
  1, 1, 1, 1, 1, 2, 3, 5, 8, 10, 10, 9, 8, 8, 8, 8, 7, 6, 5, 5, 4, 3, 2, 1,
]

function dailyRate(archetype: Archetype, dayIndex: number, totalDays: number, dow: number): number {
  switch (archetype) {
    case 'steady':
      return 18
    case 'growing':
      return 3 + (32 * dayIndex) / Math.max(totalDays, 1)
    case 'viral-spike': {
      const peak = totalDays * 0.6
      const spread = 2.5
      return 6 + 90 * Math.exp(-((dayIndex - peak) ** 2) / (2 * spread ** 2))
    }
    case 'decaying':
      return 3 + 30 * Math.exp(-dayIndex / (totalDays / 4))
    case 'weekend-heavy':
      return dow === 0 || dow === 6 ? 26 : 9
  }
}

function freshIp(rand: () => number): string {
  const o1 = 11 + Math.floor(rand() * 200)
  return `${o1}.${Math.floor(rand() * 256)}.${Math.floor(rand() * 256)}.${1 + Math.floor(rand() * 253)}`
}

export function generateClickDocs(
  rand: () => number,
  links: SeedLink[],
  ownerId: string,
  days: number,
  now: Date,
  startId = 1,
): SeedClickDoc[] {
  const DAY = 86_400_000
  const docs: SeedClickDoc[] = []

  links.forEach((link, i) => {
    const linkId = startId + i
    const end = link.deleted_at ?? link.expires_at ?? now
    const windowStart = Math.max(link.created_at.getTime(), now.getTime() - days * DAY)
    const windowEnd = Math.min(end.getTime(), now.getTime()) - (end.getTime() >= now.getTime() ? 0 : 0)
    if (windowEnd <= windowStart) return

    const startDay = Math.ceil(windowStart / DAY) * DAY
    const endDay = Math.floor(windowEnd / DAY) * DAY
    const totalDays = Math.max(Math.round((endDay - startDay) / DAY), 1)

    // Regulars make repeat visits; everyone else is a fresh one-off visitor.
    const regularIps = Array.from({ length: 24 }, () => freshIp(rand))
    const seenRegulars = new Set<string>()
    const geoByIp = new Map<string, (typeof GEO_PAIRS)[number]>()

    for (let day = startDay; day <= endDay; day += DAY) {
      const date = new Date(day)
      const dow = date.getUTCDay()
      const rate = dailyRate(link.archetype, (day - startDay) / DAY, totalDays, dow)
      const jitter = 0.6 + rand() * 0.8
      const clicks = Math.round(rate * jitter)
      for (let c = 0; c < clicks; c++) {
        // timestamp: day + weighted hour + random minute/second
        let hourAcc = 0
        const hr = rand() * HOUR_WEIGHTS.reduce((a, b) => a + b, 0)
        let hour = 0
        for (let h = 0; h < 24; h++) {
          hourAcc += HOUR_WEIGHTS[h]
          if (hr <= hourAcc) {
            hour = h
            break
          }
        }
        const ts = new Date(day + hour * 3_600_000 + Math.floor(rand() * 3_600_000))
        if (ts.getTime() > windowEnd) continue

        let ip: string
        let isUnique: boolean
        if (rand() < 0.68) {
          ip = freshIp(rand)
          isUnique = true
        } else {
          ip = regularIps[Math.floor(rand() * regularIps.length)]
          if (!seenRegulars.has(ip)) {
            seenRegulars.add(ip)
            isUnique = true
          } else {
            isUnique = false
          }
        }

        if (!geoByIp.has(ip)) {
          geoByIp.set(ip, GEO_PAIRS[Math.floor(rand() * GEO_PAIRS.length)])
        }
        const geo = geoByIp.get(ip)!
        const uaIndex = Math.floor(rand() * UA_POOL.length)
        const client = deriveClient(uaIndex)

        docs.push({
          link_id: linkId,
          link_owner_id: ownerId,
          ip,
          user_agent: UA_POOL[uaIndex],
          referrer: pickWeighted(REFERRER_POOL, REFERRER_WEIGHTS, rand()),
          timestamp: ts.toISOString(),
          country: geo.country,
          city: geo.city,
          browser: client.browser,
          os: client.os,
          device_type: client.device_type,
          is_unique: isUnique,
          _seed: true,
        })
      }
    }
  })

  return docs
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api-service && npx vitest run scripts/seed/generator.test.ts`
Expected: PASS (all suites). If the corpus-size bounds fail, tune base rates, not the test bounds (bounds encode the spec's "medium" volume).

- [ ] **Step 5: Commit**

```bash
git add api-service/scripts/seed/generator.ts api-service/scripts/seed/generator.test.ts
git commit -m "feat(api-service): deterministic seed data generator"
```

---

### Task 2: PG persistence module

**Files:**
- Create: `api-service/scripts/seed/pg.ts`

No unit tests — thin I/O wrapper over `pg`; correctness is proven by the live run in Task 5 (counts printed and checked).

- [ ] **Step 1: Implement**

```ts
// api-service/scripts/seed/pg.ts
import { Pool } from 'pg'
import { hashPassword } from '../../src/api/v1/utils/password-manager.js'
import type { SeedLink } from './generator'

export function createPgPool(connectionString: string): Pool {
  return new Pool({ connectionString, max: 5 })
}

export async function resolveUserId(pool: Pool, email: string): Promise<string> {
  const res = await pool.query<{ id: string }>('SELECT id FROM "user" WHERE email = $1', [email])
  if (res.rows.length === 0) {
    throw new Error(`No user found for ${email}. Sign up via the UI first.`)
  }
  return res.rows[0].id
}

export async function wipeSeedLinks(pool: Pool, userId: string): Promise<number> {
  const res = await pool.query("DELETE FROM links WHERE user_id = $1 AND short_code LIKE 'seed%'", [userId])
  return res.rowCount ?? 0
}

export async function insertSeedLinks(
  pool: Pool,
  userId: string,
  links: SeedLink[],
): Promise<number[]> {
  // Returns the SERIAL ids in input order — the click docs reference these.
  const hashed = await hashPassword('demo1234')
  const ids: number[] = []
  for (const l of links) {
    const res = await pool.query<{ id: number }>(
      `INSERT INTO links (short_code, long_url, password, expires_at, user_id, deleted_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now()) RETURNING id`,
      [
        l.short_code,
        l.long_url,
        l.state === 'password' ? hashed : null,
        l.expires_at,
        userId,
        l.deleted_at,
        l.created_at,
      ],
    )
    ids.push(res.rows[0].id)
  }
  return ids
}
```

Notes for the implementer:
- `hashPassword` returns `string | null`; assert non-null once before the loop (`if (!hashed) throw new Error('argon2 hashing failed')`) rather than trusting TS narrowing.
- Import path keeps the repo's `.js`-suffix ESM convention.
- If eslint flags anything about the loop (e.g. await-in-loop), disable per-line with a comment referencing batch-size simplicity — do NOT restructure into unnest/copy (ids order matters).

- [ ] **Step 2: Typecheck + lint**

Run: `cd api-service && npx tsc --noEmit && npm run lint`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add api-service/scripts/seed/pg.ts
git commit -m "feat(api-service): seed pg persistence helpers"
```

---

### Task 3: Elasticsearch persistence module

**Files:**
- Create: `api-service/scripts/seed/es.ts`

Same rationale as Task 2 for skipping unit tests (live verification in Task 5).

- [ ] **Step 1: Implement**

```ts
// api-service/scripts/seed/es.ts
import { Client } from '@elastic/elasticsearch'
import { indexNameFor, type SeedClickDoc } from './generator'

export function createEsClient(node: string): Client {
  return new Client({ node })
}

export async function wipeSeedDocs(client: Client, prefix: string): Promise<number> {
  const res = await client.deleteByQuery({
    index: `${prefix}-*`,
    query: { term: { _seed: true } },
    conflicts: 'proceed',
    refresh: true,
  })
  return res.deleted ?? 0
}

export async function bulkIndexClicks(
  client: Client,
  prefix: string,
  docs: SeedClickDoc[],
): Promise<void> {
  // Group by target daily index, then one helpers.bulk pass per group.
  const groups = new Map<string, SeedClickDoc[]>()
  for (const d of docs) {
    const idx = indexNameFor(new Date(d.timestamp), prefix)
    const arr = groups.get(idx)
    if (arr) arr.push(d)
    else groups.set(idx, [d])
  }

  for (const [index, group] of groups) {
    await client.helpers.bulk({
      datasource: group,
      onDocument: (doc) => [{ index: { _index: index } }, doc],
      refreshOnCompletion: true,
    })
  }
}
```

If `@elastic/elasticsearch` v9 typing complains about `helpers.bulk` generics or the union return of `onDocument`, cast narrowly (e.g. `onDocument: (doc: SeedClickDoc) => [{ index: { _index: index } }, doc] as any`) with an inline comment — do not fight the SDK types structurally.

- [ ] **Step 2: Typecheck + lint**

Run: `cd api-service && npx tsc --noEmit && npm run lint`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add api-service/scripts/seed/es.ts
git commit -m "feat(api-service): seed elasticsearch bulk helpers"
```

---

### Task 4: Entrypoint + npm script

**Files:**
- Create: `api-service/scripts/seed.ts`
- Modify: `api-service/package.json` (scripts block)

- [ ] **Step 1: Implement entrypoint**

```ts
// api-service/scripts/seed.ts
import { parseArgs } from 'node:util'
import { generateClickDocs, generateLinks, mulberry32, indexNameFor } from './seed/generator'
import { createEsClient, bulkIndexClicks, wipeSeedDocs } from './seed/es'
import { createPgPool, insertSeedLinks, resolveUserId, wipeSeedLinks } from './seed/pg'

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      days: { type: 'string', default: '90' },
      links: { type: 'string', default: '15' },
    },
  })
  if (!values.email) throw new Error('--email is required (the account that owns the seeded links)')
  const days = Number(values.days)
  const linkCount = Number(values.links)
  if (!Number.isFinite(days) || days < 1) throw new Error('--days must be a positive number')
  if (!Number.isFinite(linkCount) || linkCount < 1) throw new Error('--links must be a positive number')

  const DB_CONNECTION_STRING = process.env.DB_CONNECTION_STRING
  const ES_NODE = process.env.ES_NODE ?? 'http://localhost:9200'
  const ES_INDEX_PREFIX = process.env.ES_INDEX_PREFIX ?? 'shortly-clicks'
  if (!DB_CONNECTION_STRING) throw new Error('DB_CONNECTION_STRING missing — run via `npm run seed`')

  const pg = createPgPool(DB_CONNECTION_STRING)
  const es = createEsClient(ES_NODE)

  try {
    const userId = await resolveUserId(pg, values.email)
    console.log(`Owner: ${values.email} (${userId})`)

    const wipedRows = await wipeSeedLinks(pg, userId)
    const wipedDocs = await wipeSeedDocs(es, ES_INDEX_PREFIX)
    console.log(`Wiped ${wipedRows} previous seed link(s), ${wipedDocs} previous seed click doc(s)`)

    const now = new Date()
    const links = generateLinks(mulberry32(1337), linkCount, now)
    const ids = await insertSeedLinks(pg, userId, links)

    const docs = generateClickDocs(mulberry32(4242), links, userId, days, now, ids[0])
    await bulkIndexClicks(es, ES_INDEX_PREFIX, docs)

    // Summary
    const byState = new Map<string, number>()
    for (const l of links) byState.set(l.state, (byState.get(l.state) ?? 0) + 1)
    const indexes = new Set(docs.map((d) => indexNameFor(new Date(d.timestamp), ES_INDEX_PREFIX)))
    const perLink = new Map<number, number>()
    for (const d of docs) perLink.set(d.link_id, (perLink.get(d.link_id) ?? 0) + 1)
    const top = [...perLink.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)

    console.log('\n──────── seed summary ────────')
    console.log(`Links inserted : ${links.length} (${JSON.stringify([...byState])})`)
    console.log(`Click docs     : ${docs.length} across ${indexes.size} daily index(es)`)
    for (const [id, n] of top) {
      const link = links[id - ids[0]]
      console.log(`  /${link.short_code} → ${n.toLocaleString()} clicks`)
    }
    console.log('Try these in the dashboard:')
    for (const l of links.filter((x) => x.state === 'active').slice(0, 3)) {
      console.log(`  http://localhost:8000/${l.short_code}`)
    }

    // Optional live-pipeline smoke: one REAL click through Kafka → consumer → ES.
    try {
      const sample = links.find((l) => l.state === 'active')!
      const res = await fetch(`http://localhost:8000/${sample.short_code}`, { redirect: 'manual' })
      console.log(
        res.ok || res.status < 400
          ? `Live pipeline smoke: GET /${sample.short_code} → ${res.status} ✓`
          : `Live pipeline smoke: unexpected status ${res.status}`,
      )
    } catch {
      console.log('Live pipeline smoke skipped (redirection service unreachable)')
    }
  } finally {
    await pg.end()
    await es.close()
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
```

- [ ] **Step 2: Add npm script**

In `api-service/package.json`, inside `"scripts"`, add:

```json
"seed": "tsx --env-file=./.env.dev scripts/seed.ts",
```

- [ ] **Step 3: Typecheck + lint**

Run: `cd api-service && npx tsc --noEmit && npm run lint`
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add api-service/scripts/seed.ts api-service/package.json
git commit -m "feat(api-service): seed entrypoint with cli args and summary"
```

---

### Task 5: Gates + live run against the local stack

- [ ] **Step 1: Full gates**

Run: `cd api-service && npm run lint && npx vitest run && npx tsc --noEmit && npm run build`
Expected: all green (generator suite included in vitest run)

- [ ] **Step 2: Check stack is up**

```bash
curl -sf http://localhost:8080/api/v1/health-check && curl -sf http://localhost:9200/_cluster/health >/dev/null && echo STACK_OK
```

Expected: `STACK_OK`. If it fails, STOP and tell the human to run `./start.sh` first — do NOT start Docker yourself.

- [ ] **Step 3: Run the seeder (needs the human's signup email)**

Ask the human which email they log in with, then:

```bash
cd api-service && npm run seed -- --email <their-email>
```

Expected output: wipe lines (0 on first run), owner id, summary with ≥10k docs, sample codes, either a `Live pipeline smoke … ✓` line or the skip notice.

- [ ] **Step 4: Verify data landed**

```bash
docker compose -f db/docker-compose.yml exec -T shortly-main-db \
  psql -U postgres -d shortly-main-db -c "SELECT count(*) FROM links WHERE short_code LIKE 'seed%';"

curl -s "http://localhost:9200/shortly-clicks-*/_count" -H 'Content-Type: application/json' -d '{"query":{"term":{"_seed":true}}}'
curl -s "http://localhost:9200/_cat/indices/shortly-clicks-*?h=index,docs.count&s=index" | tail -8
```

Expected: PG count = link count; ES count matches summary docs; several daily indices populated spanning recent weeks.

- [ ] **Step 5: Re-run idempotency check**

Run the same `npm run seed -- --email <email>` command twice more. Expected: second/third runs wipe then recreate the SAME dataset (fixed PRNG seeds ⇒ identical counts in both summaries), never accumulating duplicates.

- [ ] **Step 6: Final commit (if any fixes were needed) + push**

```bash
git status   # confirm clean or fix stragglers
git push -u origin feat/ui-redesign-v2
```

---

## Self-Review Notes (already applied)

- Spec coverage: user resolution ✓ (Task 2), wipe/reseed ✓ (Tasks 2–3, 5.5), 15-link state mix ✓ (Task 1 `generateLinks`), archetypes/pools/is_unique ✓ (Task 1), daily-index routing ✓ (`indexNameFor` + bulk grouping), summary output ✓ (Task 4), live smoke ✓ (Task 4 + 5.3), generator tests per spec ✓ (Task 1), gates ✓ (Task 5).
- Type consistency: `SeedLink`/`SeedClickDoc`/`startId` naming aligned across Tasks 1–4; `ids[0]` passed as `startId` assumes contiguous SERIAL ids from a fresh wipe+insert batch — true because the wipe deletes only seed rows and insertion is sequential single-client; if another writer interleaves, `ids[i]-ids[0]` mapping breaks, so the entrypoint comment should note this assumption (add inline: "assumes no concurrent link inserts during seeding").
