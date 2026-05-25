import { betterAuth } from 'better-auth'
import type { Context } from 'hono'
import { pool } from '../db/index.js'
import { parsedEnv } from '../utils/env.js'
import logger from '../utils/logger.js'

export const auth = betterAuth({
  database: pool,
  socialProviders: {
    google: {
      clientId: parsedEnv.OAUTH_GOOGLE_CLIENT_ID,
      clientSecret: parsedEnv.OAUTH_GOOGLE_CLIENT_SECRET,
    },
  },
  baseURL: parsedEnv.SHORTLY_BASE_URL,
  basePath: '/api/v1/auth',
  trustedOrigins: [parsedEnv.CORS_ORIGIN],
  secret: process.env.BETTER_AUTH_SECRET || 'change-me-in-production',
  account: {
    storeStateStrategy: 'cookie',
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: 'none' as const,
      secure: true,
    },
  },
})

export const getSession = async (c: Context) => {
  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })
    return session
  } catch (error) {
    logger.error('AUTH ERROR: ', error)
    return null
  }
}
