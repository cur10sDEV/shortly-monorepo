import { Kafka } from 'kafkajs'
import { parsedEnv } from '../utils/env.js'
import logger from '../utils/logger.js'

const kafka = new Kafka({
  clientId: parsedEnv.SERVICE_ID,
  brokers: [parsedEnv.KAFKA_BROKER],
})

const producer = kafka.producer()

let connected = false

async function ensureConnected() {
  if (!connected) {
    await producer.connect()
    connected = true
  }
}

export async function publishClickEvent(event: {
  link_id: number
  link_owner_id: string
  ip: string
  user_agent: string
  referrer: string
  timestamp: string
}) {
  try {
    await ensureConnected()
    await producer.send({
      topic: parsedEnv.KAFKA_CLICK_TOPIC,
      messages: [{ value: JSON.stringify(event) }],
    })
  } catch (error) {
    logger.error('KAFKA - Failed to publish click event', error)
  }
}
