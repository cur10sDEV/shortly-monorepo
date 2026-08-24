import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { CreateLinkPanel } from '../components/Dashboard/CreateLinkPanel'
import { DeleteConfirmDialog } from '../components/Dashboard/DeleteConfirmDialog'
import { LinkListTable } from '../components/Dashboard/LinkListTable'
import { QuickCreateBar } from '../components/Dashboard/QuickCreateBar'
import { useDeleteLink, useLinks } from '../hooks/useLinks'
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

  const links = data?.data ?? []
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
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Links</h1>
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
