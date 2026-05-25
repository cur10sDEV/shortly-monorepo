import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { requireAuth } from '../../middlewares/require-auth.js'
import type { Environment } from '../../types/index.js'
import { analyticsParamsSchema, analyticsQuerySchema } from '../schemas.js'
import { getSummary, getTimeline, getReferrers, getDevices, getLocations } from '../queries.js'

const analyticsRouter = new Hono<Environment>()

analyticsRouter.use('*', requireAuth)

analyticsRouter.get(
  '/:link_id/analytics/summary',
  zValidator('param', analyticsParamsSchema),
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    const { link_id } = c.req.valid('param')
    const { from, to } = c.req.valid('query')
    const user = c.get('user')
    const data = await getSummary(link_id, user.id, from, to)
    return c.json({ success: true, data })
  },
)

analyticsRouter.get(
  '/:link_id/analytics/timeline',
  zValidator('param', analyticsParamsSchema),
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    const { link_id } = c.req.valid('param')
    const { from, to, bucket } = c.req.valid('query')
    const user = c.get('user')
    const data = await getTimeline(link_id, user.id, from, to, bucket)
    return c.json({ success: true, data })
  },
)

analyticsRouter.get(
  '/:link_id/analytics/referrers',
  zValidator('param', analyticsParamsSchema),
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    const { link_id } = c.req.valid('param')
    const { from, to } = c.req.valid('query')
    const user = c.get('user')
    const data = await getReferrers(link_id, user.id, from, to)
    return c.json({ success: true, data })
  },
)

analyticsRouter.get(
  '/:link_id/analytics/devices',
  zValidator('param', analyticsParamsSchema),
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    const { link_id } = c.req.valid('param')
    const { from, to } = c.req.valid('query')
    const user = c.get('user')
    const data = await getDevices(link_id, user.id, from, to)
    return c.json({ success: true, data })
  },
)

analyticsRouter.get(
  '/:link_id/analytics/locations',
  zValidator('param', analyticsParamsSchema),
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    const { link_id } = c.req.valid('param')
    const { from, to } = c.req.valid('query')
    const user = c.get('user')
    const data = await getLocations(link_id, user.id, from, to)
    return c.json({ success: true, data })
  },
)

export { analyticsRouter }
