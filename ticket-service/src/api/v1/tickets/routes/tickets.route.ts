import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import logger from '../../utils/logger.js'
import { objectSerializer } from '../../utils/object-serializer.js'
import { getBatchTickets, getTicket } from '../data-access/ticket.js'
import { generateBatchTicketsInputJsonSchema, generateTicketsInputJsonSchema } from '../schema.js'

export const ticketsRouter = new Hono()
  .post('/generate', zValidator('json', generateTicketsInputJsonSchema), async (c) => {
    const { metadata, service_id } = c.req.valid('json')

    logger.info('Generate Ticket', {
      metadata,
      service_id,
    })

    const ticket = await getTicket()

    if (ticket.ticket === null) {
      c.status(500)
      return c.json({
        success: false,
        data: {},
      })
    }

    const parsedTicket = objectSerializer(ticket)

    c.status(201)
    return c.json({
      success: true,
      data: {
        ticket_id: parsedTicket.ticket,
        database_id: 1,
        range_id: parsedTicket.rangeId,
        timestamp: Date.now(),
        request_id: c.get('requestId'),
      },
    })
  })
  .post('/generate-batch', zValidator('json', generateBatchTicketsInputJsonSchema), async (c) => {
    const { count, metadata, service_id } = c.req.valid('json')

    logger.info('Generate Batch Tickets', {
      count,
      metadata,
      service_id,
    })

    const batchTickets = await getBatchTickets(count)

    if (batchTickets.endTicket === null || batchTickets.rangeId === null) {
      c.status(500)
      return c.json({
        success: false,
        data: {},
      })
    }
    // start = end - batch
    const startTicket = batchTickets.endTicket - BigInt(count - 1) // start and end ticket is inclusive so subtracting 1

    const parsedBatchTicketObject = objectSerializer({
      ...batchTickets,
      startTicket,
    })

    c.status(201)
    return c.json({
      success: true,
      data: {
        start_ticket_id: parsedBatchTicketObject.startTicket,
        end_ticket_id: parsedBatchTicketObject.endTicket,
        ticket_range: count,
        database_id: 1,
        range_id: parsedBatchTicketObject.rangeId,
        timestamp: Date.now(),
        request_id: c.get('requestId'),
      },
    })
  })
