import '../../../otel/instrumentation.js' // the first to load

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'

import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
import { auth } from './lib/auth.js'
import { requestLogger } from './middlewares/request-logger.js'
import { shortUrlRouter } from './short-url/routes/index.js'
import { userRouter } from './user/routes/index.js'
import { analyticsRouter } from './analytics/routes/index.js'
import { parsedEnv } from './utils/env.js'
import logger from './utils/logger.js'
import { rateLimiter } from './middlewares/rate-limiter.js'

const app = new Hono()

// --------------------- middlewares -------------------------
app.use(
  '*',
  cors({
    origin: parsedEnv.CORS_ORIGIN,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  }),
)

app.use(secureHeaders())
app.use(requestId())
app.use(requestLogger())

// --------------------- routes -------------------------

// auth
app.on(['POST', 'GET'], '/auth/*', (c) => {
  return auth.handler(c.req.raw)
})

// short urls
app.use('/short-url/create', rateLimiter(10, 60000))
app.route('/short-url', shortUrlRouter)

// user
app.route('/user', userRouter)

// analytics
app.route('/links', analyticsRouter)

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
  logger.error('SHORT URL SERVICE - Error Middleware', error)
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
