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
