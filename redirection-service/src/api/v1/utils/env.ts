import z from 'zod'

const envSchema = z.object({
  DB_CONNECTION_STRING: z.string().min(1),
  APP_PORT: z.coerce.number().min(1000).max(64000),
  SHORTLY_BASE_URL: z.string().min(1),
  SHORTLY_API_SERVICE_BASE_URL: z.string().min(1),
  OTEL_SERVICE_NAME: z.string().min(1),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().min(1),
  LOG_LEVEL: z.enum(['info', 'debug', 'error', 'warn', 'fatal']),
  SERVICE_ID: z.string().min(1),
  API_INSTANCE_CLIENT_ID: z.string().min(1),
  REDIS_URL: z.string().min(1),
  TICKET_API_KEY: z.string().min(32),
  KAFKA_BROKER: z.string().default('localhost:9092'),
  KAFKA_CLICK_TOPIC: z.string().default('shortly-clicks'),
})

type ENV = z.infer<typeof envSchema>

export let parsedEnv: ENV

try {
  parsedEnv = envSchema.parse(process.env)
} catch (error) {
  /* eslint-disable no-console */
  console.error('Invalid Environment Variables!!!', error)
  process.exit(1)
}
