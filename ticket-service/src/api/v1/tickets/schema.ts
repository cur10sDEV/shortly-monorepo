import z from 'zod'
import { NEXT_TICKET_BACTH_RANGE, REQUEST_CONTEXT_REASONS } from './constants.js'

export const generateTicketsInputJsonSchema = z.object({
  service_id: z.string().min(1).max(128),
  metadata: z.object({
    client_id: z.string().min(1).max(128),
    request_context: z.object({
      reason: z.enum([REQUEST_CONTEXT_REASONS.SHORT_URL_GENERATION]),
    }),
  }),
})

export type GenerateTicketsInputJson = z.infer<typeof generateTicketsInputJsonSchema>

export const generateBatchTicketsInputJsonSchema = z.object({
  count: z.number().min(NEXT_TICKET_BACTH_RANGE.min).max(NEXT_TICKET_BACTH_RANGE.max),
  service_id: z.string().min(1).max(128),
  metadata: z.object({
    client_id: z.string().min(1).max(128),
    request_context: z.object({
      reason: z.enum([REQUEST_CONTEXT_REASONS.SHORT_URL_GENERATION]),
    }),
  }),
})

export type GenerateBatchTicketsInputJson = z.infer<typeof generateBatchTicketsInputJsonSchema>
