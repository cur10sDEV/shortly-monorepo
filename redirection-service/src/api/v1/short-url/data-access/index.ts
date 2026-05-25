import { pool } from '../../db/index.js'
import logger from '../../utils/logger.js'
import type { IShortUrlSchema } from '../types.js'

interface IGetShortUrlByShortCodeParams {
  short_url_code: string
}

type IGetShortUrlByShortCodeDBQueryResult = IShortUrlSchema

export const getShortUrlByShortCode = async (data: IGetShortUrlByShortCodeParams) => {
  const client = await pool.connect()

  const { short_url_code } = data

  try {
    const queryResult = await client.query<IGetShortUrlByShortCodeDBQueryResult>({
      name: 'get-short-url-by-short-code',
      text: 'SELECT * FROM links WHERE short_code = $1 and deleted_at IS NULL LIMIT 1',
      values: [short_url_code],
    })

    if (queryResult.rows.length > 0) {
      return queryResult.rows[0]
    }

    return null
  } catch (error) {
    logger.error('DB ERROR: SHORT_URL_REDIRECTION_SERVICE: getShortUrlByShortCode', error)
    return null
  } finally {
    client.release()
  }
}
