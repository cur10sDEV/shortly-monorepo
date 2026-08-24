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
  const now = new Date()
  const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  return Array.from({ length: count }, (_, i) =>
    new Date(utcMidnight.getTime() - (count - 1 - i) * 86_400_000).toISOString().slice(0, 10),
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
    const req = mockSearch.mock.calls[0]?.[0] as {
      query: Record<string, unknown>
      aggs: {
        by_link_series: { filter: { bool: { filter: Array<Record<string, unknown>> } } }
        by_link_total: { filter: { bool: { filter: Array<Record<string, unknown>> } } }
      }
    }
    expect(req.query).toEqual({ match_all: {} })
    expect(req.aggs.by_link_series.filter.bool.filter.some((f) => 'range' in f)).toBe(true)
    expect(req.aggs.by_link_total.filter.bool.filter.every((f) => !('range' in f))).toBe(true)
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

  it('fails fast when given more than 100 link ids', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => i + 1)
    await expect(getOverviewClicks('owner-1', ids)).rejects.toThrow('at most')
    expect(mockSearch).not.toHaveBeenCalled()
  })
})
