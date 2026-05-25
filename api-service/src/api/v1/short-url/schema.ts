import z from 'zod'

export const createShortUrlBodySchema = z.object({
  long_url: z.string().min(1).max(2048),
  expires_at: z.coerce.date().min(Date.now()).optional(),
  password: z.string().min(8).max(24).optional(),
})

export type CreateShortUrlBodySchema = z.infer<typeof createShortUrlBodySchema>

export const getShortUrlParamsSchema = z.object({
  short_url_id: z.coerce.number().min(1),
})

export type GetShortUrlParamsSchema = z.infer<typeof getShortUrlParamsSchema>

export const deleteShortUrlParamsSchema = getShortUrlParamsSchema

export type DeleteShortUrlParamsSchema = z.infer<typeof deleteShortUrlParamsSchema>

export const updateShortUrlParamsSchema = getShortUrlParamsSchema

export type UpdateShortUrlParamsSchema = z.infer<typeof updateShortUrlParamsSchema>

export const updateShortUrlBodySchema = z.object({
  long_url: z.string().min(1).max(2048).optional(),
  expires_at: z.coerce.date().min(Date.now()).optional(),
  password: z.string().min(8).max(24).optional(),
})

export type UpdateShortUrlBodySchema = z.infer<typeof updateShortUrlBodySchema>
