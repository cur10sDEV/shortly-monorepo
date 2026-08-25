import { afterEach, describe, expect, it, vi } from 'vitest'
import { prefersReducedMotion } from './motion'

describe('prefersReducedMotion', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns true when user prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') }))
    expect(prefersReducedMotion()).toBe(true)
  })

  it('returns false otherwise', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    expect(prefersReducedMotion()).toBe(false)
  })
})
