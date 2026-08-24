import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Activity, ArrowLeft, CalendarClock, Copy, MousePointerClick, Users } from 'lucide-react'
import { useAnalyticsDevices, useAnalyticsLocations, useAnalyticsReferrers, useAnalyticsSummary, useAnalyticsTimeline } from '../hooks/useAnalytics'
import { copyWithToast } from '../lib/clipboard'
import { QRPopover } from '../components/ui/QRPopover'
import { StatTile } from '../components/ui/StatTile'
import { Skeleton } from '../components/ui/Skeleton'
import { StatBars } from '../components/ui/StatBars'
import { TimelineChart } from '../components/Analytics/TimelineChart'
import type { AnalyticsSummary, TimelinePoint } from '../types'

export const Route = createFileRoute('/links_/$id/analytics')({
  component: LinkAnalyticsPage,
})

const RANGES = [
  { days: 7, label: '7d', bucket: 'day' },
  { days: 30, label: '30d', bucket: 'day' },
  { days: 90, label: '90d', bucket: 'week' },
] as const

// The API serves on :8000 and redirects live there; derive the public short URL
// from the current origin by swapping the port. Prefer a VITE_REDIRECT_URL env
// override here if one is introduced.
function shortUrl(id: string): string {
  return window.location.origin.replace(/:\d+$/, ':8000') + '/' + id
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function avgDaily(points: TimelinePoint[], days: number): number {
  const total = points.reduce((s, p) => s + p.clicks, 0)
  return points.length ? Math.round(total / days) : 0
}

function LinkAnalyticsPage() {
  const { id } = Route.useParams()
  const linkId = Number(id)
  const navigate = useNavigate()
  const [rangeIdx, setRangeIdx] = useState(0)
  const range = RANGES[rangeIdx]

  const summary = useAnalyticsSummary(linkId)
  const timeline = useAnalyticsTimeline(linkId, { bucket: range.bucket, from: isoDaysAgo(range.days) })
  const referrers = useAnalyticsReferrers(linkId)
  const devices = useAnalyticsDevices(linkId)
  const locations = useAnalyticsLocations(linkId)

  const summaryData: AnalyticsSummary | undefined = summary.data?.data
  const timelinePoints: TimelinePoint[] = timeline.data?.data ?? []

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4">
        <button
          onClick={() => navigate({ to: '/' })}
          className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Dashboard
        </button>
      </nav>

      <header className="flex flex-wrap items-center gap-3 mb-6">
        <span className="font-mono text-lg font-semibold text-accent">/{id}</span>
        <button
          onClick={() => copyWithToast(shortUrl(id), 'Link copied')}
          className="p-2 rounded-lg border border-line hover:bg-surface-muted transition-colors"
          aria-label="Copy short URL"
        >
          <Copy className="w-3.5 h-3.5 text-ink-muted" aria-hidden />
        </button>
        <QRPopover value={shortUrl(id)} caption={`/${id}`} />
        <div role="group" aria-label="Time range" className="ml-auto flex gap-1">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRangeIdx(i)}
              aria-pressed={rangeIdx === i}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                rangeIdx === i ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-surface-muted'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5" aria-label="Summary stats">
        <StatTile icon={MousePointerClick} label="Total clicks" value={summaryData?.total_clicks ?? 0} loading={summary.isPending} />
        <StatTile icon={Users} label="Unique" value={summaryData?.unique_clicks ?? 0} loading={summary.isPending} />
        <StatTile icon={CalendarClock} label="Avg / day" value={avgDaily(timelinePoints, range.days)} loading={timeline.isPending} />
        <div className="bg-surface border border-line rounded-[var(--radius-card)] px-4 py-3.5 hover-lift">
          <div className="flex items-center gap-2 mb-1.5">
            <Activity className="w-3.5 h-3.5 text-ink-faint" aria-hidden />
            <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">Last click</span>
          </div>
          {summary.isPending ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <span className="font-mono text-lg font-semibold text-ink">{relativeTime(summaryData?.last_click_at ?? null)}</span>
          )}
        </div>
      </section>

      <section className="bg-surface border border-line rounded-[var(--radius-card)] p-5 mb-5" aria-label="Clicks over time">
        <h3 className="text-[13px] font-semibold text-ink mb-4">Clicks over time</h3>
        <div className="h-64">
          {timeline.isPending ? <Skeleton className="h-full w-full" /> : <TimelineChart data={timeline.data?.data} />}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="bg-surface border border-line rounded-[var(--radius-card)] p-5">
          {(referrers.data?.data ?? []).length === 0 && referrers.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <StatBars title="Top referrers" rows={(referrers.data?.data ?? []).map((r) => ({ key: r.source, value: r.clicks, percentage: r.percentage }))} />
          )}
        </div>
        <div className="bg-surface border border-line rounded-[var(--radius-card)] p-5">
          {devices.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="space-y-5">
              <StatBars title="Browsers" rows={(devices.data?.data.browser ?? []).map((b) => ({ key: b.name, value: b.clicks }))} />
              <StatBars title="Operating systems" rows={(devices.data?.data.os ?? []).map((o) => ({ key: o.name, value: o.clicks }))} />
            </div>
          )}
        </div>
        <div className="bg-surface border border-line rounded-[var(--radius-card)] p-5">
          {locations.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <StatBars
              title="Locations"
              rows={(locations.data?.data ?? []).slice(0, 8).map((l) => ({ key: [l.city, l.country].filter(Boolean).join(', '), value: l.clicks }))}
            />
          )}
        </div>
      </div>
    </div>
  )
}
