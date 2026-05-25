import { Client } from '@elastic/elasticsearch'

const ES_NODE = process.env.ES_NODE || 'http://localhost:9200'
const ES_INDEX_PREFIX = process.env.ES_INDEX_PREFIX || 'shortly-clicks'

const client = new Client({ node: ES_NODE })

function getIndex(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${ES_INDEX_PREFIX}-${y}.${m}.${d}`
}

export async function indexClickEvent(doc: Record<string, unknown>) {
  const timestamp = (doc.timestamp as string) || new Date().toISOString()
  const index = getIndex(new Date(timestamp))
  await client.index({
    index,
    document: doc,
  })
}
