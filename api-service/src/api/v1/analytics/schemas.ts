import { z } from 'zod'

export const analyticsParamsSchema = z.object({
  link_id: z.coerce.number().min(1),
})

export const analyticsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  bucket: z.enum(['day', 'week', 'month']).optional(),
})
