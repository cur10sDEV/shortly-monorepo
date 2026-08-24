import type { Link } from '../types'

export type StatusTone = 'green' | 'amber' | 'purple' | 'red'

export function getLinkStatus(link: Link): { label: string; tone: StatusTone } {
  if (link.deleted_at) return { label: 'Deleted', tone: 'red' }
  if (link.expires_at && new Date(link.expires_at) < new Date()) return { label: 'Expired', tone: 'amber' }
  if (link.password) return { label: 'Protected', tone: 'purple' }
  return { label: 'Active', tone: 'green' }
}

export const TONE_CLASSES: Record<StatusTone, string> = {
  green: 'bg-green-soft text-green',
  amber: 'bg-amber-soft text-amber-warm',
  purple: 'bg-protected-soft text-protected',
  red: 'bg-danger-soft text-danger',
}
