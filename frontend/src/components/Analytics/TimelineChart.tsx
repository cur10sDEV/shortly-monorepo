import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TimelinePoint } from '../../types'

interface Props {
  data: TimelinePoint[] | undefined
  isPending: boolean
}

export function TimelineChart({ data, isPending }: Props) {
  if (isPending) return <div className="h-64 shimmer rounded-lg" />
  if (!data || data.length === 0) return <p className="text-sm text-slate-500 py-12 text-center">No data yet</p>

  return (
    <ResponsiveContainer width="100%" height={256}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.5} />
        <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: '#1E293B',
            border: '1px solid #334155',
            borderRadius: '8px',
            color: '#F1F5F9',
            fontSize: '12px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          }}
          labelStyle={{ color: '#94A3B8', marginBottom: 4 }}
        />
        <Line type="monotone" dataKey="clicks" stroke="#6366F1" strokeWidth={2} dot={{ r: 3, fill: '#6366F1' }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="unique_clicks" stroke="#14B8A6" strokeWidth={2} dot={{ r: 3, fill: '#14B8A6' }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
