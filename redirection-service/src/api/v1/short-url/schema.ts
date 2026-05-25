import z from 'zod'

export const getShortUrlByCodeParamsSchema = z.object({
  short_url_code: z.string().min(1),
})

export type GetShortUrlByCodeParamsSchema = z.infer<typeof getShortUrlByCodeParamsSchema>

export const verifyShortUrlPasswordBodySchema = z.object({
  short_url_code: z.string().min(1),
  password: z.string().min(1).max(128),
})

export type VerifyShortUrlPasswordBodySchema = z.infer<typeof verifyShortUrlPasswordBodySchema>
