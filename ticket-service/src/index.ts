import { serve } from '@hono/node-server'
import { app } from './api/v1/app.js'
import { parsedEnv } from './api/v1/utils/env.js'
import logger from './api/v1/utils/logger.js'

serve(
  {
    fetch: app.fetch,
    port: parsedEnv.APP_PORT || 3000,
  },
  (info) => {
    logger.info(`Server is running on http://localhost:${info.port}`)
  },
)
