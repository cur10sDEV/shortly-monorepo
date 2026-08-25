// api-service/scripts/seed/es.ts
import { Client } from '@elastic/elasticsearch'
import { indexNameFor, type SeedClickDoc } from './generator.js'

export function createEsClient(node: string): Client {
  return new Client({ node })
}

export async function wipeSeedDocs(client: Client, prefix: string): Promise<number> {
  const res = await client.deleteByQuery({
    index: `${prefix}-*`,
    query: { term: { _seed: true } },
    conflicts: 'proceed',
    refresh: true,
  })
  return res.deleted ?? 0
}

export async function bulkIndexClicks(
  client: Client,
  prefix: string,
  docs: SeedClickDoc[],
): Promise<void> {
  // Group by target daily index, then one helpers.bulk pass per group.
  const groups = new Map<string, SeedClickDoc[]>()
  for (const d of docs) {
    const idx = indexNameFor(new Date(d.timestamp), prefix)
    const arr = groups.get(idx)
    if (arr) arr.push(d)
    else groups.set(idx, [d])
  }

  for (const [index, group] of groups) {
    await client.helpers.bulk({
      datasource: group,
      onDocument: (doc) => [{ index: { _index: index } }, doc],
      refreshOnCompletion: true,
    })
  }
}
