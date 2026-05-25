import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import path from 'node:path'
import v1Router from './api/v1/app.js'
import { shortUrlRouter } from './api/v1/short-url/routes/index.js'
import { requestLogger } from './api/v1/middlewares/request-logger.js'
import { parsedEnv } from './api/v1/utils/env.js'
import logger from './api/v1/utils/logger.js'

const app = new Hono()

// --------------- middlewares ------------
app.use(secureHeaders())
app.use(requestId())
app.use(requestLogger())

// serve static files (before basePath to avoid /api prefix)
app.use(
  '/assets/*',
  serveStatic({
    root: path.resolve(process.cwd(), 'public/assets'),
    rewriteRequestPath: (path) => path.replace(/^\/assets/, ''),
  }),
)

// --------------- routes -----------------
// register v1 app with /api prefix
app.route('/api/v1', v1Router)

// Mount short URL routes at root for clean short URLs like http://localhost:8000/FXsl
app.route('/', shortUrlRouter)

// not-found
app.notFound(async (c) => {
  c.status(404)
  return c.json({
    status: 404,
    success: false,
    message: 'The requested resource not found!',
    requestId: c.get('requestId'),
  })
})

serve(
  {
    fetch: app.fetch,
    port: parsedEnv.APP_PORT || 3000,
  },
  (info) => {
    logger.info(`Server is running on http://localhost:${info.port}`)
  },
)
