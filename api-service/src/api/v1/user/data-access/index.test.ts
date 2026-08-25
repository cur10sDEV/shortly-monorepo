import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
const mockRelease = vi.fn()

vi.mock('../../db/index.js', () => ({
  pool: { connect: async () => ({ query: mockQuery, release: mockRelease }) },
}))

vi.mock('../../utils/logger.js', () => ({ default: { error: vi.fn() } }))

import { getUserOverviewLinks } from './index.js'

describe('getUserOverviewLinks', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockRelease.mockReset()
  })

  it('returns totals and recent links', async () => {
    mockQuery.mockImplementation(({ text }: { text: string }) => {
      if (text.includes('COUNT')) {
        return Promise.resolve({ rows: [{ total_links: '128', active_links: '121' }] })
      }
      return Promise.resolve({ rows: [{ id: 42, short_code: '9xKp' }] })
    })

    const result = await getUserOverviewLinks('user-1')
    expect(result).toEqual({
      total_links: 128,
      active_links: 121,
      recent_links: [{ id: 42, short_code: '9xKp' }],
    })
  })

  it('numbers come back as numbers not strings', async () => {
    mockQuery.mockImplementation(({ text }: { text: string }) =>
      text.includes('COUNT')
        ? Promise.resolve({ rows: [{ total_links: '0', active_links: '0' }] })
        : Promise.resolve({ rows: [] }),
    )
    const result = await getUserOverviewLinks('user-2')
    expect(result?.total_links).toBe(0)
    expect(result?.active_links).toBe(0)
    expect(result?.recent_links).toEqual([])
  })

  it('returns null on db error', async () => {
    mockQuery.mockRejectedValue(new Error('boom'))
    const result = await getUserOverviewLinks('user-3')
    expect(result).toBeNull()
    expect(mockRelease).toHaveBeenCalledOnce()
  })
})
