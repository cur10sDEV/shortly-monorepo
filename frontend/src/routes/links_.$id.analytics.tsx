import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useAnalyticsSummary, useAnalyticsTimeline, useAnalyticsReferrers, useAnalyticsDevices, useAnalyticsLocations } from '../hooks/useAnalytics'
import { AnalyticsCards } from '../components/Dashboard/AnalyticsCards'
import { TimelineChart } from '../components/Analytics/TimelineChart'
import { ReferrerList } from '../components/Analytics/ReferrerList'
import { DeviceList } from '../components/Analytics/DeviceList'
import { LocationList } from '../components/Analytics/LocationList'

export const Route = createFileRoute('/links_/$id/analytics')({
  component: LinkAnalyticsPage,
})

function LinkAnalyticsPage() {
  const { id } = Route.useParams()
  const linkId = Number(id)
  const navigate = useNavigate()
  const summary = useAnalyticsSummary(linkId)
  const timeline = useAnalyticsTimeline(linkId, { bucket: 'day' })
  const referrers = useAnalyticsReferrers(linkId)
  const devices = useAnalyticsDevices(linkId)
  const locations = useAnalyticsLocations(linkId)

  return (
    <div>
      <button
        onClick={() => navigate({ to: '/' })}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <AnalyticsCards summary={summary.data?.data} isPending={summary.isPending} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Clicks Over Time</h3>
          <TimelineChart data={timeline.data?.data} isPending={timeline.isPending} />
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Top Referrers</h3>
          <ReferrerList data={referrers.data?.data} isPending={referrers.isPending} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Browsers & OS</h3>
          <DeviceList data={devices.data?.data} isPending={devices.isPending} />
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Locations</h3>
          <LocationList data={locations.data?.data} isPending={locations.isPending} />
        </div>
      </div>
    </div>
  )
}
