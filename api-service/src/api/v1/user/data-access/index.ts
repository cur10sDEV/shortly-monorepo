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

const RECENT_LINKS_LIMIT = 100

export interface IUserOverviewLinks {
  total_links: number
  active_links: number
  recent_links: Array<{ id: number; short_code: string }>
}

export const getUserOverviewLinks = async (
  user_id: string,
): Promise<IUserOverviewLinks | null> => {
  const client = await pool.connect()
  try {
    const totals = await client.query<{ total_links: string; active_links: string }>({
      name: 'user-overview-totals',
      text: `SELECT
               COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total_links,
               COUNT(*) FILTER (WHERE deleted_at IS NULL AND (expires_at IS NULL OR expires_at > now())) AS active_links
             FROM links WHERE user_id = $1`,
      values: [user_id],
    })
    const recent = await client.query<{ id: number; short_code: string }>({
      name: 'user-overview-recent',
      text: 'SELECT id, short_code FROM links WHERE user_id = $1 AND deleted_at IS NULL ORDER BY id DESC LIMIT $2',
      values: [user_id, RECENT_LINKS_LIMIT],
    })
    return {
      total_links: Number(totals.rows[0]?.total_links ?? 0),
      active_links: Number(totals.rows[0]?.active_links ?? 0),
      recent_links: recent.rows,
    }
  } catch (error) {
    logger.error('DB ERROR: getUserOverviewLinks', error)
    return null
  } finally {
    client.release()
  }
}
