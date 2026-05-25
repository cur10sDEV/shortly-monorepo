import { Kafka, type EachBatchHandler } from 'kafkajs'

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092'
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID || 'shortly-analytics-group'
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'shortly-clicks'

const kafka = new Kafka({
  clientId: 'shortly-analytics-consumer',
  brokers: [KAFKA_BROKER],
})

const consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID })

export async function startConsumer(onBatch: EachBatchHandler) {
  await consumer.connect()
  await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false })
  await consumer.run({
    eachBatchAutoResolve: true,
    eachBatch: onBatch,
  })
  console.log(`Kafka consumer started: ${KAFKA_TOPIC}`)
}
