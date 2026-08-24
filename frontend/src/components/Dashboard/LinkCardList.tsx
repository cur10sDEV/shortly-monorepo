import { useState } from 'react'
import { BarChart3, ChevronLeft, ChevronRight, Copy, Pencil, QrCode, Trash2 } from 'lucide-react'
import { TONE_CLASSES, getLinkStatus } from '../../lib/linkStatus'
import { copyWithToast } from '../../lib/clipboard'
import { Sparkline } from '../ui/Sparkline'
import { QRPopover } from '../ui/QRPopover'
import { EmptyState } from '../ui/EmptyState'
import type { CSSProperties, ReactNode } from 'react'
import type { Link, OverviewLinkStat } from '../../types'

interface Props {
  links: Link[]
  statsByLinkId?: Map<number, OverviewLinkStat>
  hasNext: boolean
  hasPrevious: boolean
  onNext: () => void
  onPrevious: () => void
  onEdit: (link: Link) => void
  onDelete: (link: Link) => void
  onAnalytics: (link: Link) => void
  emptyAction?: ReactNode
}

export function LinkCardList({
  links, statsByLinkId, hasNext, hasPrevious, onNext, onPrevious, onEdit, onDelete, onAnalytics, emptyAction,
}: Props) {
  const [copiedId, setCopiedId] = useState<number | null>(null)

  if (links.length === 0) {
    return (
      <EmptyState
        icon={QrCode}
        title="No links yet"
        description="Paste a URL above to create your first short link — it takes under a second."
        action={emptyAction}
      />
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-2.5">
        {links.map((link, i) => {
          const status = getLinkStatus(link)
          const stat = statsByLinkId?.get(link.id)
          return (
            <div
              key={link.id}
              style={{ '--stagger-i': Math.min(i, 8) } as CSSProperties}
              className="animate-rise bg-surface border border-line rounded-[var(--radius-card)] px-4 py-3 hover-lift hover:border-line-strong"
            >
              <div className="flex items-center gap-3 min-w-0">
                <a
                  href={link.short_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-sm font-medium text-accent hover:text-accent-strong shrink-0"
                >
                  /{link.short_code}
                </a>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${TONE_CLASSES[status.tone]}`}>
                  {status.label}
                </span>

                <p className="text-xs text-ink-muted truncate flex-1">{link.long_url}</p>

                {stat && (
                  <Sparkline
                    points={stat.clicks_14d}
                    label={`${stat.clicks_total} clicks over the last 14 days`}
                  />
                )}

                {stat ? (
                  <span className="font-mono text-xs text-ink-muted w-14 text-right shrink-0" title="total clicks">
                    {stat.clicks_total.toLocaleString()}
                  </span>
                ) : null}

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { copyWithToast(`${link.short_url}`); setCopiedId(link.id); setTimeout(() => setCopiedId(null), 1500) }}
                    className="p-2 rounded-lg hover:bg-surface-muted transition-colors relative"
                    aria-label={`Copy short URL ${link.short_code}`}
                  >
                    {copiedId === link.id ? <span className="text-[10px] text-green">✓</span> : <Copy className="w-3.5 h-3.5 text-ink-muted" />}
                  </button>
                  <QRPopover value={link.short_url} caption={`/${link.short_code}`} />
                  <button onClick={() => onEdit(link)} aria-label={`Edit ${link.short_code}`}
                    className="p-2 rounded-lg hover:bg-surface-muted transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-ink-muted" />
                  </button>
                  <button onClick={() => onAnalytics(link)} aria-label={`Analytics for ${link.short_code}`}
                    className="p-2 rounded-lg hover:bg-surface-muted transition-colors">
                    <BarChart3 className="w-3.5 h-3.5 text-ink-muted" />
                  </button>
                  <button onClick={() => onDelete(link)} aria-label={`Delete ${link.short_code}`}
                    className="p-2 rounded-lg hover:bg-danger-soft transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-danger" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <nav className="flex items-center justify-between mt-4" aria-label="Pagination">
        <div className="text-xs text-ink-faint font-mono">
          {links.length} link{links.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onPrevious} disabled={!hasPrevious} aria-label="Previous page"
            className="p-2 rounded-lg border border-line hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft className="w-4 h-4 text-ink-muted" />
          </button>
          <button onClick={onNext} disabled={!hasNext} aria-label="Next page"
            className="p-2 rounded-lg border border-line hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronRight className="w-4 h-4 text-ink-muted" />
          </button>
        </div>
      </nav>
    </div>
  )
}
