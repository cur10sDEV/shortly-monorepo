import { useRef } from 'react'
import { useFocusTrap } from '../../lib/focusTrap'
import type { Link } from '../../types'

interface Props {
  link: Link | null
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}

export function DeleteConfirmDialog({
  link,
  onConfirm,
  onCancel,
  isPending,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, !!link)

  if (!link) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onCancel} aria-hidden />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Delete ${link.short_code}`}
          className="bg-surface rounded-xl border border-line shadow-[var(--shadow-overlay)] max-w-sm w-full p-6 animate-rise"
        >
          <h3 className="font-display text-base font-semibold text-ink mb-2">Delete Link</h3>
          <p className="text-sm text-ink-muted mb-6">
            Are you sure you want to delete{' '}
            <span className="font-mono text-accent">
              {link.short_code}
            </span>
            ? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={isPending}
              className="px-4 py-2 rounded-[var(--radius-control)] border border-line-strong hover:bg-surface-muted text-sm font-medium text-ink transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="px-4 py-2 rounded-[var(--radius-control)] bg-danger hover:opacity-90 text-white text-sm font-semibold transition-all disabled:opacity-40"
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
