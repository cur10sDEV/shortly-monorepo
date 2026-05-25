import { ProgressBar } from './ProgressBar'
import type { DeviceStat } from '../../types'

interface Props {
  data: DeviceStat | undefined
  isPending: boolean
}

const browserColors = ['bg-primary-500', 'bg-accent-500', 'bg-amber-500', 'bg-purple-500', 'bg-emerald-500', 'bg-rose-500']
const osColors = ['bg-accent-500', 'bg-primary-500', 'bg-amber-500', 'bg-purple-500', 'bg-emerald-500']

export function DeviceList({ data, isPending }: Props) {
  if (isPending) return <div className="space-y-3"><ShimmerBar /><ShimmerBar /></div>
  if (!data) return <p className="text-sm text-slate-500 py-8 text-center">No device data</p>

  const browserMax = Math.max(...(data.browser?.map((b) => b.clicks) || [1]), 1)
  const osMax = Math.max(...(data.os?.map((o) => o.clicks) || [1]), 1)

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Browser</h4>
        <div className="space-y-2">
          {(data.browser || []).map((b, i) => (
            <ProgressBar
              key={b.name}
              label={b.name}
              value={b.clicks}
              max={browserMax}
              color={browserColors[i % browserColors.length]}
            />
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Operating System</h4>
        <div className="space-y-2">
          {(data.os || []).map((o, i) => (
            <ProgressBar
              key={o.name}
              label={o.name}
              value={o.clicks}
              max={osMax}
              color={osColors[i % osColors.length]}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ShimmerBar() {
  return <div className="h-8 shimmer rounded-lg" />
}
