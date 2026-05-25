import type { QueryResult } from 'pg'
import { pool } from '../../db/index.js'
import type { IShortUrlSchema } from '../../short-url/types.js'
import logger from '../../utils/logger.js'

interface IGetUserLinks {
  user_id: string
  link_id?: number
  limit: number
}

type IGetUserLinksDBQueryResult = IShortUrlSchema

export const getUserLinks = async (data: IGetUserLinks) => {
  const client = await pool.connect()

  const { user_id, limit, link_id } = data

  try {
    let queryResult: QueryResult<IGetUserLinksDBQueryResult>

    if (link_id && typeof link_id === 'number') {
      queryResult = await client.query({
        name: 'get-user-links-subsequent',
        text: 'SELECT * FROM links where id < $1 AND user_id = $2 AND deleted_at IS NULL ORDER BY id DESC LIMIT $3',
        values: [link_id, user_id, limit],
      })
    } else {
      queryResult = await client.query({
        name: 'get-user-links-first',
        text: 'SELECT * FROM links where user_id = $1 AND deleted_at IS NULL ORDER BY id DESC LIMIT $2',
        values: [user_id, limit],
      })
    }

    // there can be zero results
    return queryResult.rows
  } catch (error) {
    logger.error('DB ERROR: getUserLinks', error)
    return null
  } finally {
    client.release()
  }
}
