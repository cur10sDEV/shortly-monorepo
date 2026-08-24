import { describe, it, expect, vi, beforeEach } from 'vitest'

type SearchArgs = Record<string, unknown>
const mockSearch = vi.fn<(args: SearchArgs) => Promise<Record<string, unknown>>>()

vi.mock('@elastic/elasticsearch', () => ({
  Client: class {
    search = (args: SearchArgs) => mockSearch(args)
  },
}))

vi.mock('../utils/env.js', () => ({
  parsedEnv: { ES_NODE: 'http://localhost:9200', ES_INDEX_PREFIX: 'clicks' },
}))

import { getOverviewClicks } from './queries.js'

function dayStrings(count: number): string[] {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return Array.from({ length: count }, (_, i) =>
    new Date(startOfToday.getTime() - (count - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  )
}

describe('getOverviewClicks', () => {
  beforeEach(() => mockSearch.mockReset())

  it('returns empty array when no link ids', async () => {
    const result = await getOverviewClicks('owner-1', [])
    expect(result).toEqual([])
    expect(mockSearch).not.toHaveBeenCalled()
  })

  it('maps buckets and backfills missing days with zeros', async () => {
    const days = dayStrings(14)
    mockSearch.mockResolvedValue({
      hits: { total: { value: 10 } },
      aggregations: {
        by_link_series: {
          inner: {
            buckets: [
              {
                key: 42,
                series: {
                  buckets: [
                    { key_as_string: days[13], doc_count: 7 },
                    { key_as_string: days[10], doc_count: 3 },
                  ],
                },
              },
            ],
          },
        },
        by_link_total: { inner: { buckets: [{ key: 42, doc_count: 812 }] } },
      },
    })

    const result = await getOverviewClicks('owner-1', [42])
    expect(result).toHaveLength(1)
    const link = result[0]
    expect(link.link_id).toBe(42)
    expect(link.clicks_total).toBe(812)
    expect(link.clicks_14d).toHaveLength(14)
    expect(link.clicks_14d[13]).toBe(7)
    expect(link.clicks_14d[10]).toBe(3)
    expect(link.clicks_14d[12]).toBe(0) // backfilled
  })

  it('returns zeros for link with no es bucket', async () => {
    mockSearch.mockResolvedValue({
      hits: { total: { value: 0 } },
      aggregations: {
        by_link_series: { inner: { buckets: [] } },
        by_link_total: { inner: { buckets: [] } },
      },
    })
    const result = await getOverviewClicks('owner-1', [7])
    expect(result[0]).toEqual({ link_id: 7, clicks_total: 0, clicks_14d: Array(14).fill(0) })
  })
})
