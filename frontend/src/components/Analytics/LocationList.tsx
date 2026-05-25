import { ProgressBar } from './ProgressBar'
import type { LocationStat } from '../../types'

interface Props {
  data: LocationStat[] | undefined
  isPending: boolean
}

export function LocationList({ data, isPending }: Props) {
  if (isPending) return <div className="space-y-3"><ShimmerBar /><ShimmerBar /><ShimmerBar /></div>
  if (!data || data.length === 0) return <p className="text-sm text-slate-500 py-8 text-center">No location data</p>

  const maxClicks = Math.max(...data.map((l) => l.clicks), 1)

  return (
    <div className="space-y-3">
      {data.map((loc) => (
        <ProgressBar
          key={`${loc.country}-${loc.city}`}
          label={`${loc.country}${loc.city !== 'Unknown' ? ` — ${loc.city}` : ''}`}
          value={loc.clicks}
          max={maxClicks}
          color="bg-primary-500"
        />
      ))}
    </div>
  )
}

function ShimmerBar() {
  return <div className="h-8 shimmer rounded-lg" />
}
