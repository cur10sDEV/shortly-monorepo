import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { validationMiddleware } from '../../middlewares/request-validator.js'
import { requireAuth } from '../../middlewares/require-auth.js'
import type { Environment } from '../../types/index.js'
import { DEFAULT_PAGE_LIMIT } from '../constant.js'
import { getUserLinks } from '../data-access/index.js'
import { getUserLinksQuerySchema } from '../schema.js'
import { parsedEnv } from '../../utils/env.js'

export const userRouter = new Hono<Environment>()

userRouter.use(requireAuth)

userRouter.get('/links', validationMiddleware(getUserLinksQuerySchema, 'query'), async (c) => {
  const user = c.get('user')

  const { link_id, limit } = c.req.valid('query')
  const pageLimit = limit ?? DEFAULT_PAGE_LIMIT

  const userLinks = await getUserLinks({ user_id: user.id, limit: pageLimit, link_id })

  if (userLinks === null) {
    throw new HTTPException(500, { message: 'Failed to get the short-url links' })
  }

  const data = userLinks.map((link) => ({
    ...link,
    short_url: `${parsedEnv.SHORTLY_REDIRECTION_SERVICE_BASE_URL}/${link.short_code}`,
  }))

  c.status(200)
  return c.json({
    success: true,
    data,
  })
})
