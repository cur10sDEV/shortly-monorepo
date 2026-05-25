export interface User {
  id: string
  name: string
  email: string
  image?: string
}

export interface Link {
  id: number
  short_code: string
  long_url: string
  password?: string | null
  expires_at?: string | null
  user_id: string
  deleted_at?: string | null
  created_at: string
  updated_at: string
  short_url: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  next_cursor?: number
  has_next: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface AnalyticsSummary {
  total_clicks: number
  unique_clicks: number
  last_click_at: string | null
}

export interface TimelinePoint {
  date: string
  clicks: number
  unique_clicks: number
}

export interface ReferrerStat {
  source: string
  clicks: number
  percentage: number
}

export interface DeviceStat {
  browser: { name: string; clicks: number }[]
  os: { name: string; clicks: number }[]
  device_type: { type: string; clicks: number }[]
}

export interface LocationStat {
  country: string
  city: string
  clicks: number
}
