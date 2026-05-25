interface Props {
  label: string
  value: number
  max: number
  color?: string
  showPercentage?: boolean
}

export function ProgressBar({ label, value, max, color = 'bg-primary-500', showPercentage = true }: Props) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 dark:text-slate-400 w-28 truncate shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showPercentage && (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-10 text-right">{pct}%</span>
      )}
    </div>
  )
}
