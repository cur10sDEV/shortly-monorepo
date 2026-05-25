// logger.ts
import winston from 'winston'
import { parsedEnv } from './env.js'

// Create Winston logger with OpenTelemetry support
// Winston instrumentation is handled automatically by the SDK in instrumentation.js
const logger = winston.createLogger({
  level: parsedEnv.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  ),
  defaultMeta: {
    service: parsedEnv.OTEL_SERVICE_NAME || 'my-express',
  },
  transports: [
    // Console transport with colorized output for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...metadata }) => {
          let msg = `${timestamp} [${level}]: ${message}`
          if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`
          }
          return msg
        }),
      ),
    }),
  ],
})

export default logger
