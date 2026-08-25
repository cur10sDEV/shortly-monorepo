import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BarChart3 } from 'lucide-react'
import { useLinks } from '../hooks/useLinks'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'

export const Route = createFileRoute('/analytics')({
  component: AnalyticsOverviewPage,
})

function AnalyticsOverviewPage() {
  const { data, isLoading } = useLinks()
  const navigate = useNavigate()
  const links = data?.data ?? []

  if (isLoading) {
    return (
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight text-ink mb-5">Analytics</h1>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    )
  }

  if (links.length === 0) {
    return (
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight text-ink mb-5">Analytics</h1>
        <EmptyState
          icon={BarChart3}
          title="No links to analyze"
          description="Create your first link from the dashboard to start seeing click analytics."
        />
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-xl font-bold tracking-tight text-ink mb-5">Analytics</h1>
      <p className="text-sm text-ink-muted mb-5">Select a link to view its analytics</p>
      <div className="flex flex-col gap-3">
        {links.map((link) => (
          <button
            key={link.id}
            onClick={() => navigate({ to: `/links/${link.id}/analytics` })}
            className="bg-surface border border-line rounded-[var(--radius-card)] px-4 py-3 hover-lift hover:border-line-strong text-left transition-colors flex items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm font-medium text-accent truncate">{link.short_code}</p>
              <p className="text-xs text-ink-muted truncate mt-0.5">{link.long_url}</p>
            </div>
            <BarChart3 className="w-4 h-4 text-ink-faint shrink-0" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  )
}
