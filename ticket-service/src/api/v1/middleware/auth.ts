import { createMiddleware } from 'hono/factory'
import { parsedEnv } from '../utils/env.js'

export const authMiddleware = createMiddleware(async (c, next) => {
  const apiKey = c.req.header('X-API-Key')
  if (!apiKey || apiKey !== parsedEnv.TICKET_API_KEY) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }
  await next()
})
