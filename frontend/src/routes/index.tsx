import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { CheckCircle, Link as LinkIcon, MousePointerClick } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { CreateLinkPanel } from '../components/Dashboard/CreateLinkPanel'
import { DeleteConfirmDialog } from '../components/Dashboard/DeleteConfirmDialog'
import { LinkCardList } from '../components/Dashboard/LinkCardList'
import { QuickCreateBar } from '../components/Dashboard/QuickCreateBar'
import { StatTile } from '../components/ui/StatTile'
import { Skeleton } from '../components/ui/Skeleton'
import { useDeleteLink, useLinks } from '../hooks/useLinks'
import { useOverview } from '../hooks/useOverview'
import { useAuth } from '../hooks/useAuth'
import { prefersReducedMotion } from '../lib/motion'
import type { Link, OverviewLinkStat } from '../types'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function sumByDay(perLink: Array<{ clicks_14d: number[] }>): number[] {
  const totals = Array<number>(14).fill(0)
  for (const l of perLink) l.clicks_14d.forEach((c, i) => (totals[i] += c))
  return totals
}

function DashboardPage() {
  const [cursor, setCursor] = useState<number | undefined>(undefined)
  const [cursors, setCursors] = useState<number[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<Link | null>(null)
  const [deletingLink, setDeletingLink] = useState<Link | null>(null)
  const { data } = useLinks(cursor)
  const overview = useOverview()
  const deleteLink = useDeleteLink()
  const navigate = useNavigate()
  const { user } = useAuth()

  const links = data?.data ?? []
  const hasNext = data?.has_next ?? false

  const statsByLinkId = useMemo(() => {
    const m = new Map<number, OverviewLinkStat>()
    for (const s of overview.data?.data.per_link ?? []) m.set(s.link_id, s)
    return m
  }, [overview.data])

  const totals = overview.data?.data.totals
  const weeklyDelta = useMemo(() => {
    const series = sumByDay(overview.data?.data.per_link ?? [])
    const last7 = series.slice(7).reduce((a, b) => a + b, 0)
    const prev7 = series.slice(0, 7).reduce((a, b) => a + b, 0)
    if (prev7 === 0) return last7 > 0 ? { value: 'new', positive: true } : null
    const pct = Math.round(((last7 - prev7) / prev7) * 100)
    return pct === 0 ? null : { value: `${Math.abs(pct)}%`, positive: pct > 0 }
  }, [overview.data])

  const chartData = useMemo(
    () => sumByDay(overview.data?.data.per_link ?? []).map((clicks, i) => ({ day: i, clicks })),
    [overview.data],
  )

  const handleNext = () => {
    if (data?.next_cursor) {
      setCursors((prev) => [...prev, cursor ?? 0])
      setCursor(data.next_cursor)
    }
  }
  const handlePrevious = () => {
    setCursors((prev) => {
      const next = [...prev]
      setCursor(next.pop())
      return next
    })
  }
  const handleDelete = async () => {
    if (!deletingLink) return
    await deleteLink.mutateAsync(deletingLink.id)
    setDeletingLink(null)
  }

  return (
    <div>
      <header className="flex items-baseline justify-between mb-6">
        <h1 className="font-display text-xl font-bold tracking-tight text-ink">
          {greeting()}, {(user?.name ?? '').split(' ')[0] || 'there'}
        </h1>
        <p className="hidden sm:block text-xs text-ink-faint">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          {' · '}
          <kbd className="font-mono border border-line rounded px-1 py-0.5">⌘K</kbd> for commands
        </p>
      </header>

      <QuickCreateBar onOpenPanel={() => { setEditingLink(null); setPanelOpen(true) }} />

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5" aria-label="Stats">
        <StatTile icon={LinkIcon} label="Total links" value={totals?.total_links ?? 0} loading={overview.isPending} />
        <StatTile icon={MousePointerClick} label="Total clicks" value={totals?.total_clicks ?? 0} delta={weeklyDelta} loading={overview.isPending} />
        <StatTile icon={CheckCircle} label="Active" value={totals?.active_links ?? 0} loading={overview.isPending} />
      </section>

      <section className="bg-surface border border-line rounded-[var(--radius-card)] px-4 py-3 mb-5" aria-label="Clicks over last 14 days">
        <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted mb-2">Clicks · last 14 days</p>
        <div className="h-28">
          {overview.isPending ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="dashFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--paper-accent)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="var(--paper-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="clicks" stroke="var(--paper-accent)" strokeWidth={2} fill="url(#dashFill)" isAnimationActive={!prefersReducedMotion()} animationDuration={600} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <LinkCardList
        links={links}
        statsByLinkId={statsByLinkId}
        hasNext={hasNext}
        hasPrevious={cursors.length > 0}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onEdit={(link) => { setEditingLink(link); setPanelOpen(true) }}
        onDelete={(link) => setDeletingLink(link)}
        onAnalytics={(link) => navigate({ to: `/links/${link.id}/analytics` })}
      />

      <CreateLinkPanel isOpen={panelOpen} onClose={() => { setPanelOpen(false); setEditingLink(null) }} editLink={editingLink} />
      <DeleteConfirmDialog link={deletingLink} onConfirm={handleDelete} onCancel={() => setDeletingLink(null)} isPending={deleteLink.isPending} />
    </div>
  )
}
