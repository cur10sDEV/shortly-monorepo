interface Row {
  key: string
  value: number | string
  percentage?: number
}

interface Props {
  title: string
  rows: Row[]
  emptyMessage?: string
}

export function StatBars({ title, rows, emptyMessage = 'No data yet' }: Props) {
  const hasPercentages = rows.some((r) => r.percentage !== undefined)
  const denominator = hasPercentages
    ? 100
    : Math.max(...rows.map((r) => (typeof r.value === 'number' ? r.value : 0)), 1)
  const fillWidth = (row: Row): number => {
    const numerator = hasPercentages ? (row.percentage ?? 0) : typeof row.value === 'number' ? row.value : 0
    return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)))
  }
  return (
    <section aria-label={title}>
      <h3 className="text-[13px] font-semibold text-ink mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-ink-faint py-4">{emptyMessage}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.slice(0, 8).map((row) => (
            <li key={row.key} className="group">
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="text-xs text-ink truncate">{row.key}</span>
                <span className="font-mono text-[11px] text-ink-muted shrink-0">
                  {typeof row.value === 'number' ? row.value.toLocaleString() : row.value}
                  {row.percentage !== undefined ? ` · ${row.percentage}%` : ''}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                <div
                  data-testid="bar-fill"
                  className="h-full rounded-full bg-accent group-hover:bg-accent-strong transition-colors"
                  style={{ width: `${fillWidth(row)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
