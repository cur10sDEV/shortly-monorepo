import { ProgressBar } from './ProgressBar'
import type { ReferrerStat } from '../../types'

interface Props {
  data: ReferrerStat[] | undefined
  isPending: boolean
}

export function ReferrerList({ data, isPending }: Props) {
  if (isPending) return <div className="space-y-3"><ShimmerBar /><ShimmerBar /><ShimmerBar /></div>
  if (!data || data.length === 0) return <p className="text-sm text-slate-500 py-8 text-center">No referrer data</p>

  const maxClicks = Math.max(...data.map((r) => r.clicks), 1)

  return (
    <div className="space-y-3">
      {data.map((r) => (
        <ProgressBar
          key={r.source}
          label={r.source === '' ? 'Direct' : r.source}
          value={r.clicks}
          max={maxClicks}
          color={r.source === '' ? 'bg-slate-400' : 'bg-primary-500'}
        />
      ))}
    </div>
  )
}

function ShimmerBar() {
  return <div className="h-8 shimmer rounded-lg" />
}
