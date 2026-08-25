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
} from './generator.js'

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
    const refSet = new Set<string>(REFERRER_POOL)
    const uaSet = new Set<string>(UA_POOL)
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
