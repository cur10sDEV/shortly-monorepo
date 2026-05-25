import { zValidator } from '@hono/zod-validator'
import type { ValidationTargets } from 'hono'
import type { ZodType } from 'zod'

// custom validator to handle zValidator errors
export const validationMiddleware = <T extends ZodType, U extends keyof ValidationTargets>(schema: T, target: U) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      c.status(400)
      return c.json({
        success: false,
        message: 'Invalid inputs!',
      })
    }
  })
