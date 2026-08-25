import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { validationMiddleware } from '../../middlewares/request-validator.js'
import { requireAuth } from '../../middlewares/require-auth.js'
import type { Environment } from '../../types/index.js'
import { DEFAULT_PAGE_LIMIT } from '../constant.js'
import { getUserLinks, getUserOverviewLinks } from '../data-access/index.js'
import { getOverviewClicks } from '../../analytics/queries.js'
import { getUserLinksQuerySchema } from '../schema.js'
import { parsedEnv } from '../../utils/env.js'
import logger from '../../utils/logger.js'

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

userRouter.get('/analytics/overview', async (c) => {
  const user = c.get('user')

  const overviewLinks = await getUserOverviewLinks(user.id)
  if (overviewLinks === null) {
    throw new HTTPException(500, { message: 'Failed to load overview' })
  }

  const linkIds = overviewLinks.recent_links.map((l) => l.id)
  let clicksByLink = new Map<number, { clicks_total: number; clicks_14d: number[] }>()
  try {
    const aggregates = await getOverviewClicks(
      user.id,
      linkIds,
    )
    clicksByLink = new Map(aggregates.map((a) => [a.link_id, a]))
  } catch (error) {
    logger.error('ES ERROR: overview aggregates failed, serving zeroed series', error)
  }

  const per_link = overviewLinks.recent_links.map((l) => ({
    link_id: l.id,
    short_code: l.short_code,
    ...(clicksByLink.get(l.id) ?? { clicks_total: 0, clicks_14d: Array<number>(14).fill(0) }),
  }))

  c.status(200)
  return c.json({
    success: true,
    data: {
      totals: {
        total_links: overviewLinks.total_links,
        active_links: overviewLinks.active_links,
        total_clicks: per_link.reduce((sum, p) => sum + p.clicks_total, 0),
      },
      per_link,
    },
  })
})
