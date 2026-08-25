import { describe, expect, it } from 'vitest'
import { rangeStartIso } from './analyticsRange'

describe('rangeStartIso', () => {
  it('returns a UTC day-boundary ISO string N days back', () => {
    const iso = rangeStartIso(7)
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/)
    const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000)
    expect(days).toBeGreaterThanOrEqual(7)
    expect(days).toBeLessThanOrEqual(8)
  })

  it('is stable across calls in the same day (safe as a query key)', () => {
    expect(rangeStartIso(30)).toBe(rangeStartIso(30))
  })
})
