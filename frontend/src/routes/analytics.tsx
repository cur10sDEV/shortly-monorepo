import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BarChart3, ExternalLink } from 'lucide-react'
import { useLinks } from '../hooks/useLinks'

export const Route = createFileRoute('/analytics')({
  component: AnalyticsOverviewPage,
})

function AnalyticsOverviewPage() {
  const { data } = useLinks()
  const navigate = useNavigate()
  const links = data?.data ?? []

  if (links.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Analytics</h1>
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <BarChart3 className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-lg font-medium text-slate-900 dark:text-white">No links yet</p>
          <p className="text-sm text-slate-500 mt-1">Create some links to see analytics</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Analytics</h1>
      <p className="text-sm text-slate-500 mb-6">Select a link to view its analytics</p>
      <div className="flex flex-col gap-3">
        {links.map((link) => (
          <button
            key={link.id}
            onClick={() => navigate({ to: `/links/${link.id}/analytics` })}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-left hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-150 flex items-center gap-4"
          >
            <div className="p-2.5 rounded-lg bg-primary-50 dark:bg-primary-900/20">
              <ExternalLink className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono font-medium text-primary-600 dark:text-primary-400 mb-0.5">
                {link.short_code}
              </p>
              <p className="text-xs text-slate-500 truncate">{link.long_url}</p>
            </div>
            <BarChart3 className="w-5 h-5 text-slate-400" />
          </button>
        ))}
      </div>
    </div>
  )
}
