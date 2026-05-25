import { pool } from '../../db/index.js'
import logger from '../../utils/logger.js'

interface GetTicketReturnType {
  ticket: bigint | null
  rangeId: number | null
}

export const getTicket = async (): Promise<GetTicketReturnType> => {
  const result: GetTicketReturnType = { rangeId: null, ticket: null }

  const client = await pool.connect() // fresh client for this transaction

  try {
    // transaction start
    await client.query('BEGIN')

    // get the current ticket count
    const selectedActiveRangeRow = await client.query({
      name: 'get-active-range',
      text: `SELECT "id" FROM ranges WHERE "status" = 'active' AND "current" < "end" FOR UPDATE SKIP LOCKED LIMIT 1`, // only get the active and non-exhausted range, lock for update and skip if already locked
    })

    if (selectedActiveRangeRow.rows.length > 0) {
      // udpate the current ticket count and status based on current + 1 >= end, if yes then status = 'exhausted'
      const updatedRange = await client.query({
        name: 'update-current-and-status-by-range-id',
        text: `UPDATE ranges SET "current" = "current" + 1, "status" = CASE WHEN "current" + 1 >= "end" THEN 'exhausted' ELSE "status" END, "updated_at" = now() WHERE "id" = $1 RETURNING *`,
        values: [selectedActiveRangeRow.rows[0]['id']],
      })

      // update values in the result object
      result.ticket = updatedRange.rows[0]['current'] as bigint // use the current before update
      result.rangeId = updatedRange.rows[0]['id'] as number // range row id which is being used
    }

    // commit the transaction
    await client.query('COMMIT')
  } catch (error) {
    // abort transaction
    await client.query('ROLLBACK')

    logger.error('DB Error - GetNextTicket', error)
  } finally {
    // close connection
    client.release()
  }
  return result
}

interface GetBatchTicketsReturnType {
  endTicket: bigint | null
  rangeId: number | null
}

export const getBatchTickets = async (batchSize: number): Promise<GetBatchTicketsReturnType> => {
  const result: GetBatchTicketsReturnType = {
    endTicket: null,
    rangeId: null,
  }

  const client = await pool.connect() // fresh client for this transaction
  try {
    // transaction start
    await client.query('BEGIN')

    // get the current ticket count
    const selectedActiveRangeRow = await client.query({
      name: 'get-active-range-with-available-batch-size',
      text: `SELECT * FROM ranges WHERE "status" = 'active' AND "current" + $1 < "end" FOR UPDATE SKIP LOCKED LIMIT 1`, // only get the active and non-exhausted range, lock for update and skip if already locked
      values: [batchSize],
    })

    if (selectedActiveRangeRow.rows.length > 0) {
      // udpate the current ticket count and status based on current + count >= end, if yes then status = 'exhausted'
      const updatedRange = await client.query({
        name: 'update-current-with-batch-size-and-status-by-range-id',
        text: `UPDATE ranges SET "current" = "current" + $1, "status" = CASE WHEN "current" + $1 >= "end" THEN 'exhausted' ELSE "status" END, "updated_at" = now() WHERE "id" = $2 RETURNING *`,
        values: [batchSize, selectedActiveRangeRow.rows[0]['id']],
      })

      // update the values in the result object
      result.endTicket = updatedRange.rows[0]['current'] as bigint
      result.rangeId = selectedActiveRangeRow.rows[0]['id'] as number // range row id which is being modified
    }

    // commit the transaction
    await client.query('COMMIT')
  } catch (error) {
    // abort the transaction
    await client.query('ROLLBACK')

    logger.error('DB Error - GetNextTicketBatch', error)
  } finally {
    // close connection
    client.release()
  }
  return result
}
