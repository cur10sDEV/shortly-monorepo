import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { prefersReducedMotion } from '../../lib/motion'
import type { TimelinePoint } from '../../types'

interface Props {
  data?: TimelinePoint[] | null
}

const TICK_STYLE = { fontSize: 11, fontFamily: 'JetBrains Mono', fill: 'var(--paper-ink-faint)' }
const REDUCED = prefersReducedMotion()

export function TimelineChart({ data }: Props) {
  if (!data || data.length === 0) return <p className="text-sm text-ink-faint py-12 text-center">No data yet</p>

  return (
    <div role="img" aria-label="Clicks over time chart" className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id="timelineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--paper-accent)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--paper-accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--paper-line)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={TICK_STYLE} tickLine={false} axisLine={false} />
        <YAxis tick={TICK_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ stroke: 'var(--paper-line-strong)' }}
          contentStyle={{
            background: 'var(--paper-surface)',
            border: '1px solid var(--paper-line-strong)',
            borderRadius: '8px',
            color: 'var(--paper-ink)',
            fontSize: '12px',
            boxShadow: 'var(--shadow-card-hover)',
          }}
          labelStyle={{ color: 'var(--paper-ink-muted)', marginBottom: 4 }}
        />
        <Area
          type="monotone"
          dataKey="clicks"
          stroke="var(--paper-accent)"
          strokeWidth={2}
          fill="url(#timelineFill)"
          dot={false}
          activeDot={{ r: 5 }}
          isAnimationActive={!REDUCED}
          animationDuration={600}
        />
        <Line
          type="monotone"
          dataKey="unique_clicks"
          stroke="var(--paper-teal)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5 }}
          isAnimationActive={!REDUCED}
          animationDuration={600}
        />
      </ComposedChart>
    </ResponsiveContainer>
    </div>
  )
}
