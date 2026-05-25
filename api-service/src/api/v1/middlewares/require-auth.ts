import { createMiddleware } from 'hono/factory'
import { getSession } from '../lib/auth.js'

export const requireAuth = createMiddleware(async (c, next) => {
  const session = await getSession(c)

  if (session && session.user && session.session) {
    c.set('user', session.user)
    c.set('session', session.session)
    return await next()
  }

  c.status(401)
  return c.json({
    status: 401,
    message: 'Not Authorized',
  })
})
