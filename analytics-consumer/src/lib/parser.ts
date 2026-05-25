import { UAParser } from 'ua-parser-js'

export function parseUserAgent(ua: string): {
  browser: string | null
  os: string | null
  device_type: string | null
} {
  if (!ua) return { browser: null, os: null, device_type: null }
  const result = UAParser(ua)
  const browser = result.browser.name || null
  const os = result.os.name || null
  const device = result.device
  let deviceType: string | null = 'desktop'
  if (device.type === 'mobile') deviceType = 'mobile'
  else if (device.type === 'tablet') deviceType = 'tablet'
  return { browser, os, device_type: deviceType }
}
