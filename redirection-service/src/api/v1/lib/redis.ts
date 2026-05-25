import { Redis } from 'ioredis'
import { REDIS_KEY_PREFIX } from '../short-url/constant.js'
import { parsedEnv } from '../utils/env.js'
import { isJson } from '../utils/is-json.js'
import logger from '../utils/logger.js'

let redis: Redis
try {
  redis = new Redis(parsedEnv.REDIS_URL)
} catch (error) {
  logger.error('REDIS: CONNECTION ERROR', error)
}

const EXPIRATION_TIMES = {
  ONE_HOUR: 60 * 60, // default
  ONE_DAY: 60 * 60 * 24,
  ONE_WEEK: 60 * 60 * 24 * 7,
}

interface ISetCacheOptions {
  expiry?: keyof typeof EXPIRATION_TIMES
}

export const setCache = async <T>(key: string, data: T, { expiry = 'ONE_HOUR' }: ISetCacheOptions = {}) => {
  try {
    const res = await redis.set(key, JSON.stringify(data), 'EX', EXPIRATION_TIMES[expiry])
    if (res !== 'OK') {
      throw new Error(`Failed to set key: ${key}`)
    }
  } catch (error) {
    logger.error('REDIS ERROR - setCache', error)
  }
}

export const getCache = async <T>(key: string) => {
  try {
    const res = await redis.get(key)
    if (res) {
      if (isJson(res)) {
        return JSON.parse(res) as T
      }
      return res as T
    }
    throw new Error(`Failed to get key: ${key}`)
  } catch (error) {
    logger.error('REDIS ERROR - getCache', error)
    return null
  }
}

export const generateCacheKey = (key: string) => {
  return `${REDIS_KEY_PREFIX}:${key}`
}

export const deleteCache = async (key: string): Promise<void> => {
  try {
    await redis.del(key)
  } catch (error) {
    logger.error('REDIS - Error deleting cache', error)
  }
}
