import { Pool, types, type ConnectionConfig } from 'pg'
import { parsedEnv } from '../utils/env.js'
import logger from '../utils/logger.js'

// bigint custom parser
types.setTypeParser(20, (input) => BigInt(input))

const config: ConnectionConfig = {
  connectionString: parsedEnv.DB_CONNECTION_STRING,
  query_timeout: 3000,
  application_name: parsedEnv.OTEL_SERVICE_NAME,
}

export const pool = new Pool({ ...config, max: 25, min: 5 })

try {
  await pool.connect()
} catch (error) {
  logger.error('Error connecting Database!!!', error)
  process.exit(1)
}
