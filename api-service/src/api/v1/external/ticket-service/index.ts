import { randomUUID } from 'node:crypto'
import { parsedEnv } from '../../utils/env.js'
import logger from '../../utils/logger.js'

interface IGetTicketResponse {
  success: boolean
  data: {
    ticket_id: string
    database_id: number
    range_id: number
    timestamp: EpochTimeStamp
    request_id: string
  }
}

const REQUEST_CONTEXT_REASONS = {
  SHORT_URL_GENERATION: 'SHORT_URL_GENERATION',
}

export const getTicket = async () => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(`${parsedEnv.SHORTLY_TICKET_SERVICE_BASE_URL}/tickets/generate`, {
      method: 'POST',
      headers: {
        'X-Request-Id': randomUUID(),
        'Content-Type': 'application/json',
        'X-API-Key': parsedEnv.TICKET_API_KEY,
      },
      body: JSON.stringify({
        service_id: parsedEnv.SERVICE_ID,
        metadata: {
          client_id: parsedEnv.API_INSTANCE_CLIENT_ID,
          request_context: {
            reason: REQUEST_CONTEXT_REASONS.SHORT_URL_GENERATION,
          },
        },
      }),
      credentials: 'include',
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      throw new Error('Failed to generate ticket')
    }

    const data = (await res.json()) as IGetTicketResponse

    if (!data.success) {
      throw new Error('Error Generating Ticket')
    }

    return data.data
  } catch (error) {
    logger.error('EXTERNAL API CALL FAILED - TICKET SERVICE', error)
    return null
  }
}
