import z from 'zod'
import { DEFAULT_PAGE_LIMIT } from './constant.js'

export const getUserLinksQuerySchema = z.object({
  link_id: z.coerce.number().min(1).max(Number.MAX_SAFE_INTEGER).optional(),
  limit: z.coerce.number().min(10).max(50).default(DEFAULT_PAGE_LIMIT).optional().catch(DEFAULT_PAGE_LIMIT),
})
