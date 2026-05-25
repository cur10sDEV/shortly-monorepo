import { Copy, BarChart3, Pencil, Trash2, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import type { Link } from '../../types'
import { useState } from 'react'

interface Props {
  links: Link[]
  hasNext: boolean
  hasPrevious: boolean
  onNext: () => void
  onPrevious: () => void
  onEdit: (link: Link) => void
  onDelete: (link: Link) => void
  onAnalytics: (link: Link) => void
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

function getLinkStatus(link: Link): { label: string; class: string } {
  if (link.deleted_at) return { label: 'Deleted', class: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' }
  if (link.expires_at && new Date(link.expires_at) < new Date()) return { label: 'Expired', class: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' }
  if (link.password) return { label: 'Protected', class: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' }
  return { label: 'Active', class: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' }
}

export function LinkListTable({
  links, hasNext, hasPrevious, onNext, onPrevious, onEdit, onDelete, onAnalytics,
}: Props) {
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const handleCopy = (link: Link) => {
    copyToClipboard(link.short_url)
    setCopiedId(link.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (links.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <ExternalLink className="w-7 h-7 text-slate-400" />
        </div>
        <p className="text-lg font-medium text-slate-900 dark:text-white">No links yet</p>
        <p className="text-sm text-slate-500 mt-1">Create your first short link above</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-3">
        {links.map((link) => {
          const status = getLinkStatus(link)
          return (
            <div
              key={link.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-150"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="text-sm font-mono font-medium text-primary-600 dark:text-primary-400">
                      {link.short_code}
                    </span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${status.class}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xl">
                    {link.long_url}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopy(link)}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors relative"
                    title="Copy short URL"
                  >
                    {copiedId === link.id ? (
                      <span className="text-[10px] font-medium text-emerald-600 absolute -top-2 -right-1 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">Copied!</span>
                    ) : null}
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  <button
                    onClick={() => onAnalytics(link)}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    title="View analytics"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  <button
                    onClick={() => onEdit(link)}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  <button
                    onClick={() => onDelete(link)}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-xs text-slate-400">
          Showing {links.length} link{links.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  )
}
