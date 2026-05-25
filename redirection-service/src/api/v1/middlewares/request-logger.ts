import { getConnInfo } from '@hono/node-server/conninfo'
import { createMiddleware } from 'hono/factory'
import logger from '../utils/logger.js'

export const requestLogger = () =>
  createMiddleware(async (c, next) => {
    await next()
    const conninfo = getConnInfo(c)
    logger.info(`Incoming request: ${c.req.method} ${c.req.path}`, {
      method: c.req.method,
      path: c.req.path,
      query: c.req.query(),
      ip: conninfo.remote.address,
      userAgent: c.req.raw.headers.get('User-Agent'),
      resStatus: c.res.status,
    })
  })
