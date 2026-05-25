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
