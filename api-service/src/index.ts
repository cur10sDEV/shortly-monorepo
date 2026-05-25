import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import v1Router from './api/v1/app.js'
import { parsedEnv } from './api/v1/utils/env.js'
import logger from './api/v1/utils/logger.js'

const app = new Hono().basePath('/api')

// register v1 app
app.route('/v1', v1Router)

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
    port: parsedEnv.APP_PORT || 8080,
  },
  (info) => {
    logger.info(`Server is running on http://localhost:${info.port}`)
  },
)
