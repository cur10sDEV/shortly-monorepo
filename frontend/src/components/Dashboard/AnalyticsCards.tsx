import { MousePointerClick, Users, CalendarClock, Clock } from 'lucide-react'
import type { AnalyticsSummary } from '../../types'

interface Props {
  summary: AnalyticsSummary | undefined
  isPending: boolean
}

export function AnalyticsCards({ summary, isPending }: Props) {
  const totalClicks = summary?.total_clicks ?? 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        icon={<MousePointerClick className="w-5 h-5" />}
        label="Total Clicks"
        value={isPending ? '—' : totalClicks.toLocaleString()}
        iconBg="bg-primary-50 dark:bg-primary-900/20"
        iconColor="text-primary-600 dark:text-primary-400"
      />
      <StatCard
        icon={<Users className="w-5 h-5" />}
        label="Unique Clicks"
        value={isPending ? '—' : (summary?.unique_clicks ?? 0).toLocaleString()}
        iconBg="bg-accent-50 dark:bg-accent-900/20"
        iconColor="text-accent-600 dark:text-accent-400"
      />
      <StatCard
        icon={<CalendarClock className="w-5 h-5" />}
        label="Avg. Daily"
        value="—"
        iconBg="bg-amber-50 dark:bg-amber-900/20"
        iconColor="text-amber-600 dark:text-amber-400"
      />
      <StatCard
        icon={<Clock className="w-5 h-5" />}
        label="Last Click"
        value={isPending ? '—' : summary?.last_click_at ? new Date(summary.last_click_at).toLocaleDateString() : 'Never'}
        iconBg="bg-purple-50 dark:bg-purple-900/20"
        iconColor="text-purple-600 dark:text-purple-400"
      />
    </div>
  )
}

function StatCard({ icon, label, value, iconBg, iconColor }: {
  icon: React.ReactNode
  label: string
  value: string
  iconBg: string
  iconColor: string
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  )
}
