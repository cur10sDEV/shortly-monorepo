import { getLinkStatus } from '../../lib/linkStatus'
import type { Link } from '../../types'

export type StatusFilter = 'all' | 'active' | 'expired' | 'protected'

export function filterLinks(links: Link[], query: string, status: StatusFilter): Link[] {
  const q = query.trim().toLowerCase()
  return links.filter((link) => {
    if (q && !`${link.short_code} ${link.long_url}`.toLowerCase().includes(q)) return false
    if (status !== 'all' && getLinkStatus(link).label.toLowerCase() !== status) return false
    return true
  })
}
