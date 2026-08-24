import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { CheckCircle, Link as LinkIcon, MousePointerClick } from 'lucide-react'
import { CreateLinkPanel } from '../components/Dashboard/CreateLinkPanel'
import { DeleteConfirmDialog } from '../components/Dashboard/DeleteConfirmDialog'
import { LinkListTable } from '../components/Dashboard/LinkListTable'
import { QuickCreateBar } from '../components/Dashboard/QuickCreateBar'
import { useDeleteLink, useLinks } from '../hooks/useLinks'
import type { Link } from '../types'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

function DashboardPage() {
  const [cursor, setCursor] = useState<number | undefined>(undefined)
  const [cursors, setCursors] = useState<number[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<Link | null>(null)
  const [deletingLink, setDeletingLink] = useState<Link | null>(null)
  const { data } = useLinks(cursor)
  const deleteLink = useDeleteLink()
  const navigate = useNavigate()

  const links = data?.data ?? []
  const activeLinks = links.filter((l) => !l.deleted_at)
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
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <LinkIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Links</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{links.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-accent-50 dark:bg-accent-900/20 rounded-lg">
              <MousePointerClick className="w-5 h-5 text-accent-600 dark:text-accent-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Clicks</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">—</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Links</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeLinks.length}</p>
            </div>
          </div>
        </div>
      </div>
      <QuickCreateBar onOpenPanel={() => setPanelOpen(true)} />
      <LinkListTable
        links={links}
        hasNext={hasNext}
        hasPrevious={cursors.length > 0}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onEdit={handleEdit}
        onDelete={(link) => setDeletingLink(link)}
        onAnalytics={(link) => navigate({ to: `/links/${link.id}/analytics` })}
      />
      <CreateLinkPanel
        isOpen={panelOpen}
        onClose={() => {
          setPanelOpen(false)
          setEditingLink(null)
        }}
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
