import { pool } from '../../db/index.js'
import logger from '../../utils/logger.js'
import type { DeleteShortUrlParamsSchema, GetShortUrlParamsSchema } from '../schema.js'
import type { IShortUrlSchema } from '../types.js'

// add short-url link
interface IAddNewShortUrlParams {
  short_code: string
  long_url: string
  password: string | null
  expires_at: Date | number | null
  user_id: string
}

type IAddNewShortUrlDBQueryResult = IShortUrlSchema

export const addNewShortUrl = async (data: IAddNewShortUrlParams) => {
  const client = await pool.connect()

  const { short_code, long_url, password, expires_at, user_id } = data

  try {
    const queryResult = await client.query<IAddNewShortUrlDBQueryResult>({
      name: 'add-new-short-url',
      text: 'INSERT INTO links(short_code, long_url, password, expires_at, user_id) VALUES ($1, $2, $3, $4,$5) RETURNING *',
      values: [short_code, long_url, password, expires_at, user_id],
    })

    if (queryResult.rows.length > 0) {
      return queryResult.rows[0]
    }

    return null
  } catch (error) {
    logger.error('DB ERROR: addNewShortUrl', error)
    return null
  } finally {
    client.release()
  }
}

// get short-url link
interface IGetShortUrlParams extends GetShortUrlParamsSchema {
  user_id: string
}

type IGetShortUrlDBQueryResult = IShortUrlSchema

export const getShortUrl = async (data: IGetShortUrlParams) => {
  const client = await pool.connect()

  const { short_url_id, user_id } = data
  try {
    const queryResult = await client.query<IGetShortUrlDBQueryResult>({
      name: 'get-short-url-by-id',
      text: 'SELECT * FROM links WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      values: [short_url_id, user_id],
    })

    if (queryResult.rows.length > 0) {
      return queryResult.rows[0]
    }

    return null
  } catch (error) {
    logger.error('DB ERROR: getShortUrl', error)
    return null
  } finally {
    client.release()
  }
}

// update short-url link
interface IUpdateShortUrlParams {
  id: number
  user_id: string
  expires_at: Date | number | null
  long_url: string | null
  password: string | null
}

type IUpdateShortUrlDBQueryResult = IShortUrlSchema

export const updateShortUrl = async (data: IUpdateShortUrlParams) => {
  const client = await pool.connect()

  const { id, user_id, expires_at, long_url, password } = data

  try {
    const queryResult = await client.query<IUpdateShortUrlDBQueryResult>({
      name: 'update-short-url',
      text: 'UPDATE links SET long_url = $1, password = $2, expires_at = $3 WHERE id = $4 AND user_id = $5 AND deleted_at IS NULL RETURNING *',
      values: [long_url, password, expires_at, id, user_id],
    })

    if (queryResult.rows.length > 0) {
      return queryResult.rows[0]
    }

    return null
  } catch (error) {
    logger.error('DB ERROR: updateShortUrl', error)
    return null
  } finally {
    client.release()
  }
}

// delete short-url link
interface IDeleteShortUrlParams extends DeleteShortUrlParamsSchema {
  user_id: string
}

interface IDeleteShortUrlDBQueryResult {
  short_code: string
}

export const deleteShortUrl = async (data: IDeleteShortUrlParams) => {
  const client = await pool.connect()

  const { short_url_id, user_id } = data

  try {
    const queryResult = await client.query<IDeleteShortUrlDBQueryResult>({
      name: 'delete-short-url',
      text: 'UPDATE links SET deleted_at = now() where id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING short_code, id',
      values: [short_url_id, user_id],
    })

    if (queryResult.rows.length > 0) {
      return queryResult.rows[0]
    }

    return null
  } catch (error) {
    logger.error('DB ERROR: deleteShortUrl', error)
    return null
  } finally {
    client.release()
  }
}
