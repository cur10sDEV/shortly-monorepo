import { CountUp } from './CountUp'
import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  label: string
  value: number
  delta?: { value: string; positive: boolean } | null
  loading?: boolean
}

export function StatTile({ icon: Icon, label, value, delta = null, loading = false }: Props) {
  return (
    <div className="bg-surface border border-line rounded-[var(--radius-card)] px-4 py-3.5 hover-lift">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-ink-faint" aria-hidden />
        <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        {loading ? (
          <span className="inline-block h-6 w-20 rounded-md shimmer" aria-label={`loading ${label}`} />
        ) : (
          <>
            <CountUp value={value} className="font-display text-2xl font-bold text-ink" />
            {delta && (
              <span
                className={`font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                  delta.positive ? 'bg-green-soft text-green' : 'bg-danger-soft text-danger'
                }`}
              >
                {delta.positive ? '▲' : '▼'} {delta.value}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
