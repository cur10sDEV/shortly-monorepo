import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { CreateLinkPanel } from '../components/Dashboard/CreateLinkPanel'
import { DeleteConfirmDialog } from '../components/Dashboard/DeleteConfirmDialog'
import { LinkCardList } from '../components/Dashboard/LinkCardList'
import {  filterLinks } from '../components/Dashboard/filterLinks'
import { QuickCreateBar } from '../components/Dashboard/QuickCreateBar'
import { useDeleteLink, useLinks } from '../hooks/useLinks'
import type {StatusFilter} from '../components/Dashboard/filterLinks';
import type { Link } from '../types'

export const Route = createFileRoute('/links')({
  component: LinksPage,
})

function LinksPage() {
  const [cursor, setCursor] = useState<number | undefined>(undefined)
  const [cursors, setCursors] = useState<number[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<Link | null>(null)
  const [deletingLink, setDeletingLink] = useState<Link | null>(null)
  const { data } = useLinks(cursor)
  const deleteLink = useDeleteLink()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')

  const links = data?.data ?? []
  const filtered = useMemo(() => filterLinks(links, query, status), [links, query, status])
  const hasNext = data?.has_next ?? false

  const handleNext = () => {
    if (data?.next_cursor) {
      setCursors((prev) => [...prev, cursor ?? 0])
      setCursor(data.next_cursor)
    }
  }

  const handlePrevious = () => {
    setCursors((prev) => {
      const newCursors = [...prev]
      const prevCursor = newCursors.pop()
      setCursor(prevCursor)
      return newCursors
    })
  }

  const handleEdit = (link: Link) => {
    setEditingLink(link)
    setPanelOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingLink) return
    await deleteLink.mutateAsync(deletingLink.id)
    setDeletingLink(null)
  }

  return (
    <div>
      <header className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="font-display text-xl font-bold tracking-tight text-ink mr-auto">Links</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search links…"
            aria-label="Search links"
            className="w-56 pl-8 pr-3 py-2 rounded-full border border-line-strong bg-surface text-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent transition-colors"
          />
        </div>
        <div role="group" aria-label="Filter by status" className="flex gap-1">
          {(['all', 'active', 'expired', 'protected'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                status === s ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-surface-muted'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>
      <QuickCreateBar onOpenPanel={() => setPanelOpen(true)} />
      <LinkCardList
        links={filtered}
        hasNext={hasNext}
        hasPrevious={cursors.length > 0}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onEdit={handleEdit}
        onDelete={(link) => setDeletingLink(link)}
        onAnalytics={(link) => navigate({ to: `/links/${link.id}/analytics` })}
        emptyAction={<button onClick={() => setPanelOpen(true)} className="px-4 py-2 rounded-[var(--radius-control)] bg-ink text-white dark:text-[#1C1B18] dark:bg-[#EDEAE4] text-sm font-semibold">Create a link</button>}
      />
      <CreateLinkPanel
        isOpen={panelOpen}
        onClose={() => { setPanelOpen(false); setEditingLink(null) }}
        editLink={editingLink}
      />
      <DeleteConfirmDialog
        link={deletingLink}
        onConfirm={handleDelete}
        onCancel={() => setDeletingLink(null)}
        isPending={deleteLink.isPending}
      />
    </div>
  )
}
