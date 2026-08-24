import { describe, expect, it } from 'vitest'
import { filterLinks } from './filterLinks'
import type { Link } from '../../types'

const mk = (over: Partial<Link>): Link => ({
  id: 1, short_code: 'x', long_url: 'https://e.com', user_id: 'u',
  created_at: '', updated_at: '', short_url: '', ...over,
})

describe('filterLinks', () => {
  const links = [
    mk({ id: 1, short_code: '9xKp', long_url: 'https://stripe.com/payments' }),
    mk({ id: 2, short_code: 'aB3d', long_url: 'https://github.com/x', password: 'h' }),
    mk({ id: 3, short_code: 'zZ9y', long_url: 'https://expired.io', expires_at: new Date(Date.now() - 1000).toISOString() }),
  ]

  it('filters by query across code and target', () => {
    expect(filterLinks(links, 'stripe', 'all').map((l) => l.id)).toEqual([1])
    expect(filterLinks(links, 'ab3d', 'all').map((l) => l.id)).toEqual([2])
  })

  it('filters by status', () => {
    expect(filterLinks(links, '', 'protected').map((l) => l.id)).toEqual([2])
    expect(filterLinks(links, '', 'expired').map((l) => l.id)).toEqual([3])
    expect(filterLinks(links, '', 'active').map((l) => l.id)).toEqual([1])
  })

  it('combines both', () => {
    expect(filterLinks(links, 'github', 'protected').map((l) => l.id)).toEqual([2])
    expect(filterLinks(links, 'github', 'active')).toEqual([])
  })
})
