import '../../../otel/instrumentation.js' // the first to load

import { Hono } from 'hono'

import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
import { shortUrlRouter } from './short-url/routes/index.js'
import logger from './utils/logger.js'

const app = new Hono()

// --------------------- routes -------------------------
// short urls
app.route('/short-url', shortUrlRouter)

// health-check
app.get('/health-check', (c) => {
  c.status(200)
  return c.json({
    status: 200,
    success: true,
    message: 'The service is healthy 🚀',
    request_id: c.get('requestId'),
  })
})

app.onError(async (error, c) => {
  logger.error('SHORT URL REDIRECTION SERVICE - Error Middleware', error)
  if (error instanceof HTTPException) {
    c.status(error.status)
    return c.json({
      success: false,
      message: error.message,
    })
  }
  if (error instanceof ZodError) {
    c.status(400)
    return c.json({ success: false, message: 'Invalid Input!' })
  }
  c.status(500)
  return c.json({
    success: false,
    message: 'Something went wrong!',
  })
})

export default app
