import { startConsumer } from './lib/kafka.js'
import { resolveGeo } from './lib/geoip.js'
import { parseUserAgent } from './lib/parser.js'
import { indexClickEvent } from './lib/elasticsearch.js'
import type { ClickEvent, EnrichedClickEvent } from './types/index.js'

// Simple in-memory dedup: track IP+link_id with timestamps
const dedupWindow = 60 * 60 * 1000 // 1 hour
const dedupCache = new Map<string, number>()

function isUnique(linkId: number, ip: string): boolean {
  const key = `${linkId}:${ip}`
  const now = Date.now()
  const last = dedupCache.get(key)
  if (last && now - last < dedupWindow) return false
  dedupCache.set(key, now)
  return true
}

async function main() {
  await startConsumer(async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary }) => {
    for (const message of batch.messages) {
      if (!message.value) continue
      try {
        const event: ClickEvent = JSON.parse(message.value.toString())
        const { country, city } = await resolveGeo(event.ip)
        const { browser, os, device_type } = parseUserAgent(event.user_agent)
        const unique = isUnique(event.link_id, event.ip)

        const enriched: EnrichedClickEvent = {
          ...event,
          country,
          city,
          browser,
          os,
          device_type,
          is_unique: unique,
        }

        await indexClickEvent(enriched as unknown as Record<string, unknown>)
        await resolveOffset(message.offset)
        await commitOffsetsIfNecessary()
      } catch (error) {
        console.error('Failed to process message', error)
      }
    }
    await heartbeat()
  })
}

main().catch(console.error)
