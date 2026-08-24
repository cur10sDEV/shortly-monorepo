import { Client } from '@elastic/elasticsearch'
import { parsedEnv } from '../utils/env.js'

const esClient = new Client({
  node: parsedEnv.ES_NODE,
  headers: {
    accept: 'application/vnd.elasticsearch+json; compatible-with=8',
    'content-type': 'application/vnd.elasticsearch+json; compatible-with=8',
  },
})

function getIndices(): string[] {
  const prefix = parsedEnv.ES_INDEX_PREFIX
  return [`${prefix}-*`]
}

function timeFilter(from?: string, to?: string) {
  const filters: Record<string, unknown>[] = []
  if (from) filters.push({ range: { timestamp: { gte: from } } })
  if (to) filters.push({ range: { timestamp: { lte: to } } })
  return filters
}

export async function getSummary(linkId: number, linkOwnerId: string, from?: string, to?: string) {
  const filters: Record<string, unknown>[] = [
    { term: { link_id: linkId } },
    { term: { 'link_owner_id.keyword': linkOwnerId } },
    ...timeFilter(from, to),
  ]
  const result = await esClient.search({
    index: getIndices(),
    size: 0,
    query: { bool: { filter: filters } },
    aggs: {
      unique_clicks: { cardinality: { field: 'ip.keyword' } },
      last_click: { max: { field: 'timestamp' } },
    },
  })
  return {
    total_clicks: (result.hits.total as { value: number }).value || 0,
    unique_clicks: (result.aggregations?.unique_clicks as { value: number })?.value || 0,
    last_click_at: (result.aggregations?.last_click as { value_as_string?: string })?.value_as_string || null,
  }
}

export async function getTimeline(
  linkId: number,
  linkOwnerId: string,
  from?: string,
  to?: string,
  bucket: string = 'day',
) {
  const interval = bucket === 'week' ? 'week' : bucket === 'month' ? 'month' : 'day'
  const filters: Record<string, unknown>[] = [
    { term: { link_id: linkId } },
    { term: { 'link_owner_id.keyword': linkOwnerId } },
    ...timeFilter(from, to),
  ]
  const result = await esClient.search({
    index: getIndices(),
    size: 0,
    query: { bool: { filter: filters } },
    aggs: {
      timeline: {
        date_histogram: {
          field: 'timestamp',
          calendar_interval: interval,
          format: 'yyyy-MM-dd',
        },
        aggs: {
          unique_clicks: { cardinality: { field: 'ip.keyword' } },
        },
      },
    },
  })
  const buckets =
    (
      result.aggregations?.timeline as {
        buckets: Array<{ key_as_string: string; doc_count: number; unique_clicks: { value: number } }>
      }
    )?.buckets || []
  return buckets.map((b) => ({
    date: b.key_as_string,
    clicks: b.doc_count,
    unique_clicks: b.unique_clicks.value,
  }))
}

export async function getReferrers(linkId: number, linkOwnerId: string, from?: string, to?: string) {
  const filters: Record<string, unknown>[] = [
    { term: { link_id: linkId } },
    { term: { 'link_owner_id.keyword': linkOwnerId } },
    ...timeFilter(from, to),
  ]
  const result = await esClient.search({
    index: getIndices(),
    size: 0,
    query: { bool: { filter: filters } },
    aggs: {
      referrers: {
        terms: { field: 'referrer.keyword', size: 20 },
      },
    },
  })
  const buckets =
    (result.aggregations?.referrers as { buckets: Array<{ key: string; doc_count: number }> })?.buckets || []
  const total = buckets.reduce((sum, b) => sum + b.doc_count, 0)
  return buckets.map((b) => ({
    source: b.key || 'Direct',
    clicks: b.doc_count,
    percentage: total > 0 ? Math.round((b.doc_count / total) * 100) : 0,
  }))
}

export async function getDevices(linkId: number, linkOwnerId: string, from?: string, to?: string) {
  const filters: Record<string, unknown>[] = [
    { term: { link_id: linkId } },
    { term: { 'link_owner_id.keyword': linkOwnerId } },
    ...timeFilter(from, to),
  ]
  const result = await esClient.search({
    index: getIndices(),
    size: 0,
    query: { bool: { filter: filters } },
    aggs: {
      browsers: { terms: { field: 'browser.keyword', size: 10 } },
      os: { terms: { field: 'os.keyword', size: 10 } },
      device_types: { terms: { field: 'device_type.keyword', size: 5 } },
    },
  })
  const extract = (agg: string) =>
    ((result.aggregations?.[agg] as { buckets: Array<{ key: string; doc_count: number }> })?.buckets || []).map(
      (b: { key: string; doc_count: number }) => ({ name: b.key, clicks: b.doc_count }),
    )
  return {
    browser: extract('browsers'),
    os: extract('os'),
    device_type: extract('device_types'),
  }
}

export async function getLocations(linkId: number, linkOwnerId: string, from?: string, to?: string) {
  const filters: Record<string, unknown>[] = [
    { term: { link_id: linkId } },
    { term: { 'link_owner_id.keyword': linkOwnerId } },
    ...timeFilter(from, to),
  ]
  const result = await esClient.search({
    index: getIndices(),
    size: 0,
    query: { bool: { filter: filters } },
    aggs: {
      locations: {
        terms: { field: 'country.keyword', size: 20 },
        aggs: {
          cities: { terms: { field: 'city.keyword', size: 5 } },
        },
      },
    },
  })
  const buckets =
    (
      result.aggregations?.locations as {
        buckets: Array<{
          key: string
          doc_count: number
          cities: { buckets: Array<{ key: string; doc_count: number }> }
        }>
      }
    )?.buckets || []
  const result2: Array<{ country: string; city: string; clicks: number }> = []
  for (const b of buckets) {
    if (b.cities?.buckets?.length) {
      for (const c of b.cities.buckets) {
        result2.push({ country: b.key, city: c.key, clicks: c.doc_count })
      }
    } else {
      result2.push({ country: b.key, city: 'Unknown', clicks: b.doc_count })
    }
  }
  return result2
}

export interface IOverviewLinkClicks {
  link_id: number
  clicks_total: number
  clicks_14d: number[]
}

const OVERVIEW_WINDOW_DAYS = 14
const OVERVIEW_MAX_LINKS = 100

function overviewWindow(): { days: string[]; min: string; max: string; gteIso: string } {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const days: string[] = []
  for (let i = OVERVIEW_WINDOW_DAYS - 1; i >= 0; i--) {
    days.push(new Date(startOfToday.getTime() - i * 86_400_000).toISOString().slice(0, 10))
  }
  return {
    days,
    min: days[0],
    max: days[days.length - 1],
    gteIso: new Date(startOfToday.getTime() - (OVERVIEW_WINDOW_DAYS - 1) * 86_400_000).toISOString(),
  }
}

export async function getOverviewClicks(
  linkOwnerId: string,
  linkIds: number[],
): Promise<IOverviewLinkClicks[]> {
  if (linkIds.length === 0) return []

  const window = overviewWindow()

  const result = await esClient.search({
    index: getIndices(),
    size: 0,
    query: { match_all: {} },
    aggs: {
      by_link_series: {
        filter: {
          bool: {
            filter: [
              { term: { 'link_owner_id.keyword': linkOwnerId } },
              { terms: { link_id: linkIds } },
              { range: { timestamp: { gte: window.gteIso } } },
            ],
          },
        },
        aggs: {
          inner: {
            terms: { field: 'link_id', size: OVERVIEW_MAX_LINKS },
            aggs: {
              series: {
                date_histogram: {
                  field: 'timestamp',
                  calendar_interval: 'day',
                  format: 'yyyy-MM-dd',
                  min_doc_count: 0,
                  extended_bounds: { min: window.min, max: window.max },
                  time_zone: '+00:00',
                },
              },
            },
          },
        },
      },
      by_link_total: {
        filter: {
          bool: {
            filter: [
              { term: { 'link_owner_id.keyword': linkOwnerId } },
              { terms: { link_id: linkIds } },
            ],
          },
        },
        aggs: { inner: { terms: { field: 'link_id', size: OVERVIEW_MAX_LINKS } } },
      },
    },
  })

  type SeriesBucket = { key_as_string: string; doc_count: number }
  type LinkBucket = { key: number; doc_count: number; series?: { buckets: SeriesBucket[] } }
  type OverviewAggs = {
    by_link_series?: { inner?: { buckets?: LinkBucket[] } }
    by_link_total?: { inner?: { buckets?: LinkBucket[] } }
  }

  const aggs = (result.aggregations ?? {}) as OverviewAggs

  const seriesByLink = new Map<number, SeriesBucket[]>()
  for (const b of aggs.by_link_series?.inner?.buckets ?? []) {
    if (b.series?.buckets) seriesByLink.set(b.key, b.series.buckets)
  }
  const totalsByLink = new Map<number, number>()
  for (const b of aggs.by_link_total?.inner?.buckets ?? []) {
    totalsByLink.set(b.key, b.doc_count)
  }

  return linkIds.map((id) => {
    const seriesBuckets = seriesByLink.get(id) ?? []
    const byDay = new Map(seriesBuckets.map((b) => [b.key_as_string, b.doc_count]))
    return {
      link_id: id,
      clicks_total: totalsByLink.get(id) ?? 0,
      clicks_14d: window.days.map((day) => byDay.get(day) ?? 0),
    }
  })
}
