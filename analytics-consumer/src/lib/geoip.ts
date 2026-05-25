import type { GeoIpResponse } from '../types/index.js'

const IPAPI_URL = process.env.IPAPI_URL || 'http://ip-api.com/json'

export async function resolveGeo(ip: string): Promise<{ country: string | null; city: string | null }> {
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1') {
    return { country: null, city: null }
  }
  try {
    const res = await fetch(`${IPAPI_URL}/${ip}?fields=status,country,city`)
    const data = (await res.json()) as GeoIpResponse
    if (data.status === 'success') {
      return { country: data.country, city: data.city }
    }
  } catch {
    // GeoIP failures are non-critical
  }
  return { country: null, city: null }
}
