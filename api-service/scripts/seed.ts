// api-service/scripts/seed.ts
import { parseArgs } from 'node:util'
import { generateClickDocs, generateLinks, mulberry32, indexNameFor } from './seed/generator.js'
import { createEsClient, bulkIndexClicks, wipeSeedDocs } from './seed/es.js'
import { createPgPool, insertSeedLinks, resolveUserId, wipeSeedLinks } from './seed/pg.js'

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      days: { type: 'string', default: '90' },
      links: { type: 'string', default: '15' },
    },
  })
  if (!values.email) throw new Error('--email is required (the account that owns the seeded links)')
  const days = Number(values.days)
  const linkCount = Number(values.links)
  if (!Number.isFinite(days) || days < 1) throw new Error('--days must be a positive number')
  if (!Number.isFinite(linkCount) || linkCount < 1) throw new Error('--links must be a positive number')

  const DB_CONNECTION_STRING = process.env.DB_CONNECTION_STRING
  const ES_NODE = process.env.ES_NODE ?? 'http://localhost:9200'
  const ES_INDEX_PREFIX = process.env.ES_INDEX_PREFIX ?? 'shortly-clicks'
  if (!DB_CONNECTION_STRING) throw new Error('DB_CONNECTION_STRING missing — run via `npm run seed`')

  const pg = createPgPool(DB_CONNECTION_STRING)
  const es = createEsClient(ES_NODE)

  try {
    const userId = await resolveUserId(pg, values.email)
    console.log(`Owner: ${values.email} (${userId})`)

    const wipedRows = await wipeSeedLinks(pg, userId)
    const wipedDocs = await wipeSeedDocs(es, ES_INDEX_PREFIX)
    console.log(`Wiped ${wipedRows} previous seed link(s), ${wipedDocs} previous seed click doc(s)`)

    const now = new Date()
    const links = generateLinks(mulberry32(1337), linkCount, now)
    // ids[0] is passed as startId so docs' link_id maps onto real SERIAL ids;
    // assumes no concurrent link inserts during seeding (wipe + sequential single-client insert).
    const ids = await insertSeedLinks(pg, userId, links)

    const docs = generateClickDocs(mulberry32(4242), links, userId, days, now, ids[0])
    const failedDocs = await bulkIndexClicks(es, ES_INDEX_PREFIX, docs)
    if (failedDocs > 0) {
      console.warn(`Warning: ${failedDocs} click doc(s) failed to index — partial data, summary below reflects generated counts only`)
    }

    // Summary
    const byState = new Map<string, number>()
    for (const l of links) byState.set(l.state, (byState.get(l.state) ?? 0) + 1)
    const indexes = new Set(docs.map((d) => indexNameFor(new Date(d.timestamp), ES_INDEX_PREFIX)))
    const perLink = new Map<number, number>()
    for (const d of docs) perLink.set(d.link_id, (perLink.get(d.link_id) ?? 0) + 1)
    const top = [...perLink.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)

    console.log('\n──────── seed summary ────────')
    console.log(`Links inserted : ${links.length} (${JSON.stringify([...byState])})`)
    console.log(`Click docs     : ${docs.length} across ${indexes.size} daily index(es)`)
    for (const [id, n] of top) {
      const link = links[id - ids[0]]
      console.log(`  /${link.short_code} → ${n.toLocaleString()} clicks`)
    }
    console.log('Try these in the dashboard:')
    for (const l of links.filter((x) => x.state === 'active').slice(0, 3)) {
      console.log(`  http://localhost:8000/${l.short_code}`)
    }

    // Optional live-pipeline smoke: one REAL click through Kafka → consumer → ES.
    try {
      const sample = links.find((l) => l.state === 'active')!
      const res = await fetch(`http://localhost:8000/${sample.short_code}`, { redirect: 'manual' })
      console.log(
        res.ok || res.status < 400
          ? `Live pipeline smoke: GET /${sample.short_code} → ${res.status} ✓`
          : `Live pipeline smoke: unexpected status ${res.status}`,
      )
    } catch {
      console.log('Live pipeline smoke skipped (redirection service unreachable)')
    }
  } finally {
    await pg.end()
    await es.close()
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
