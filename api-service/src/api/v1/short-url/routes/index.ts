import { encode } from '@cur10sdev/base62-encoder-decoder'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { getTicket } from '../../external/ticket-service/index.js'
import { validationMiddleware } from '../../middlewares/request-validator.js'
import { requireAuth } from '../../middlewares/require-auth.js'
import type { Environment } from '../../types/index.js'
import { parsedEnv } from '../../utils/env.js'
import logger from '../../utils/logger.js'
import { hashPassword } from '../../utils/password-manager.js'
import { addNewShortUrl, deleteShortUrl, getShortUrl, updateShortUrl } from '../data-access/index.js'
import {
  createShortUrlBodySchema,
  deleteShortUrlParamsSchema,
  getShortUrlParamsSchema,
  updateShortUrlBodySchema,
  updateShortUrlParamsSchema,
} from '../schema.js'

const invalidateCache = async (shortCode: string) => {
  try {
    await fetch(`${parsedEnv.SHORTLY_REDIRECTION_SERVICE_BASE_URL}/api/v1/short-url/invalidate-cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': parsedEnv.TICKET_API_KEY,
      },
      body: JSON.stringify({ short_code: shortCode }),
    })
  } catch (error) {
    logger.error('Failed to invalidate cache', error)
  }
}

export const shortUrlRouter = new Hono<Environment>()

// all /short-url routes require auth
shortUrlRouter.use('*', requireAuth)

// create short-url link
shortUrlRouter.post('/create', validationMiddleware(createShortUrlBodySchema, 'json'), async (c) => {
  const { long_url, expires_at, password } = c.req.valid('json')

  const user = c.get('user')

  const ticketData = await getTicket()

  if (!ticketData) {
    throw new HTTPException(500, { message: 'Failed to shorten the url!' })
  }

  const ticket_id = ticketData.ticket_id

  // handling big-ints
  const short_url_code = encode(BigInt(ticket_id))

  let finalPassword = password
  if (finalPassword) {
    const hash = await hashPassword(finalPassword)
    if (hash) {
      finalPassword = hash
    }
  }

  if (password && !finalPassword) {
    throw new HTTPException(500, { message: 'Failed to hash password' })
  }

  const queryData = {
    short_code: short_url_code,
    long_url,
    password: finalPassword ? finalPassword : null,
    expires_at: expires_at ? expires_at : null,
    user_id: user.id,
  }

  const newShortUrlData = await addNewShortUrl(queryData)

  if (!newShortUrlData) {
    throw new HTTPException(500, { message: 'Failed to shorten the url' })
  }

  c.status(201)
  return c.json({
    success: true,
    data: {
      ...newShortUrlData,
      short_url: `${parsedEnv.SHORTLY_REDIRECTION_SERVICE_BASE_URL}/${newShortUrlData.short_code}`,
    },
  })
})

// get short-url link
shortUrlRouter.get('/:short_url_id', validationMiddleware(getShortUrlParamsSchema, 'param'), async (c) => {
  const { short_url_id } = c.req.valid('param')

  const user = c.get('user')

  const shortUrlData = await getShortUrl({ short_url_id, user_id: user.id })

  if (!shortUrlData) {
    throw new HTTPException(404, { message: 'No short-url link found!' })
  }

  c.status(200)
  return c.json({
    success: true,
    data: {
      ...shortUrlData,
    },
  })
})

// update short-url link
shortUrlRouter.patch(
  '/:short_url_id',
  validationMiddleware(updateShortUrlParamsSchema, 'param'),
  validationMiddleware(updateShortUrlBodySchema, 'json'),
  async (c) => {
    const { short_url_id } = c.req.valid('param')

    const { long_url, password, expires_at } = c.req.valid('json')

    const user = c.get('user')

    const shortUrlData = await getShortUrl({ short_url_id, user_id: user.id })

    if (!shortUrlData || !shortUrlData.id || !shortUrlData.user_id) {
      throw new HTTPException(404, { message: 'No short-link found!' })
    }

    let finalPassword = password
    if (finalPassword) {
      const hash = await hashPassword(finalPassword)
      if (hash) {
        finalPassword = hash
      }
    }

    if (password && !finalPassword) {
      throw new HTTPException(500, { message: 'Failed to hash password' })
    }

    const queryData = {
      id: shortUrlData.id,
      user_id: shortUrlData.user_id,
      long_url: long_url ? long_url : shortUrlData.long_url,
      password: finalPassword ? finalPassword : shortUrlData.password,
      expires_at: expires_at ? expires_at : shortUrlData.expires_at,
    }

    const updatedShortUrlData = await updateShortUrl(queryData)

    if (!updatedShortUrlData) {
      throw new HTTPException(500, { message: 'Failed to update short-link!' })
    }

    invalidateCache(shortUrlData.short_code)

    c.status(200)
    return c.json({
      success: true,
      data: {
        ...updatedShortUrlData,
      },
    })
  },
)

// delete short-url link
shortUrlRouter.delete('/:short_url_id', validationMiddleware(deleteShortUrlParamsSchema, 'param'), async (c) => {
  const { short_url_id } = c.req.valid('param')

  const user = c.get('user')

  const shortUrlData = await getShortUrl({ short_url_id, user_id: user.id })

  if (!shortUrlData || !shortUrlData.id || !shortUrlData.user_id) {
    throw new HTTPException(404, { message: 'No short-link found!' })
  }

  const deletedShortUrlData = await deleteShortUrl({ short_url_id: shortUrlData.id, user_id: shortUrlData.user_id })

  if (!deletedShortUrlData) {
    throw new HTTPException(500, { message: 'Failed to delete short-url link!' })
  }

  invalidateCache(shortUrlData.short_code)

  c.status(200)
  return c.json({
    success: true,
    data: {
      ...deletedShortUrlData,
    },
  })
})
