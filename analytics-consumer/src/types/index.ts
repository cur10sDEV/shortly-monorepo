export interface ClickEvent {
  link_id: number
  link_owner_id: string
  ip: string
  user_agent: string
  referrer: string
  timestamp: string
}

export interface EnrichedClickEvent extends ClickEvent {
  country: string | null
  city: string | null
  browser: string | null
  os: string | null
  device_type: string | null
  is_unique: boolean
}

export interface GeoIpResponse {
  status: string
  country: string
  city: string
}
