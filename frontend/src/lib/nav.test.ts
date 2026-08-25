import { describe, expect, it } from 'vitest'
import { isNavActive } from './nav'

describe('isNavActive', () => {
  it('marks Dashboard active only on exact root path', () => {
    expect(isNavActive('/', '/')).toBe(true)
    expect(isNavActive('/', '/links')).toBe(false)
  })

  it('marks Links active on the links list', () => {
    expect(isNavActive('/links', '/links')).toBe(true)
  })

  it('marks Analytics active on the analytics picker', () => {
    expect(isNavActive('/analytics', '/analytics')).toBe(true)
  })

  it('maps per-link stats (/links/$id/analytics) to Analytics, not Links', () => {
    const pathname = '/links/abc123/analytics'
    expect(isNavActive('/analytics', pathname)).toBe(true)
    expect(isNavActive('/links', pathname)).toBe(false)
  })

  it('keeps other sections prefix-matched', () => {
    expect(isNavActive('/settings', '/settings')).toBe(true)
    expect(isNavActive('/settings', '/links')).toBe(false)
  })
})
