import { createMiddleware } from 'hono/factory'
import logger from '../utils/logger.js'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

const cleanup = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 60000)
cleanup.unref()

export const rateLimiter = (maxRequests: number, windowMs: number) =>
  createMiddleware(async (c, next) => {
    const ip = c.req.header('x-forwarded-for') || 'unknown'
    const now = Date.now()
    const key = `${ip}:${c.req.path}`

    let entry = store.get(key)
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs }
      store.set(key, entry)
    }

    entry.count++
    if (entry.count > maxRequests) {
      logger.warn(`Rate limit exceeded for ${key}`)
      return c.json({ success: false, message: 'Too many requests' }, 429)
    }

    await next()
  })
