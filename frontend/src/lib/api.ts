import type {
  ApiResponse,
  Link,
  PaginatedResponse,
  AnalyticsSummary,
  TimelinePoint,
  ReferrerStat,
  DeviceStat,
  LocationStat,
} from '../types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export const linksApi = {
  list: (cursor?: number) =>
    fetchApi<PaginatedResponse<Link>>(
      `/user/links${cursor ? `?cursor=${cursor}` : ''}`
    ),
  create: (data: {
    long_url: string
    password?: string
    expires_at?: string
  }) =>
    fetchApi<ApiResponse<Link>>('/short-url/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { long_url?: string; password?: string }) =>
    fetchApi<ApiResponse<Link>>(`/short-url/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<ApiResponse<{ short_code: string }>>(`/short-url/${id}`, {
      method: 'DELETE',
    }),
}

export const analyticsApi = {
  summary: (linkId: number) =>
    fetchApi<ApiResponse<AnalyticsSummary>>(
      `/links/${linkId}/analytics/summary`
    ),
  timeline: (
    linkId: number,
    params?: { from?: string; to?: string; bucket?: string }
  ) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.bucket) qs.set('bucket', params.bucket)
    return fetchApi<ApiResponse<TimelinePoint[]>>(
      `/links/${linkId}/analytics/timeline${qs.toString() ? `?${qs}` : ''}`
    )
  },
  referrers: (linkId: number) =>
    fetchApi<ApiResponse<ReferrerStat[]>>(
      `/links/${linkId}/analytics/referrers`
    ),
  devices: (linkId: number) =>
    fetchApi<ApiResponse<DeviceStat>>(`/links/${linkId}/analytics/devices`),
  locations: (linkId: number) =>
    fetchApi<ApiResponse<LocationStat[]>>(
      `/links/${linkId}/analytics/locations`
    ),
}
