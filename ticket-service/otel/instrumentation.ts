import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import { parsedEnv } from '../src/api/v1/utils/env.js'
import logger from '../src/api/v1/utils/logger.js'

// Create OTLP exporters
const traceExporter = new OTLPTraceExporter({
  url: `${parsedEnv.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
})

const logExporter = new OTLPLogExporter({
  url: `${parsedEnv.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs`,
})

// Create resource with service name
const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: parsedEnv.OTEL_SERVICE_NAME || 'shortly-ticket-service',
})

// Initialize Node SDK
const sdk = new NodeSDK({
  resource,
  logRecordProcessors: [new BatchLogRecordProcessor(logExporter)],
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Automatically instruments Express, HTTP, and other Node.js libraries
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Disable file system instrumentation if not needed
      },
    }),
    // Winston instrumentation for log correlation with traces
    new WinstonInstrumentation({
      logHook: (span, record) => {
        record['resource.service.name'] = parsedEnv.OTEL_SERVICE_NAME || 'shortly-ticket-service'
      },
    }),
  ],
})

// Start the SDK
try {
  sdk.start()
  logger.info('OpenTelemetry instrumentation initialized successfully')
} catch (error) {
  logger.error('Error initializing OpenTelemetry:', error)
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => logger.info('OpenTelemetry SDK shut down successfully'))
    .catch((error) => logger.error('Error shutting down OpenTelemetry:', error))
    .finally(() => process.exit(0))
})
