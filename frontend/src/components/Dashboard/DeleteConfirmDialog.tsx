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
  if (!link) return null

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 z-40" onClick={onCancel} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-sm w-full p-6">
          <h3 className="text-lg font-semibold mb-2">Delete Link</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Are you sure you want to delete{' '}
            <span className="font-mono text-primary-600 dark:text-primary-400">
              {link.short_code}
            </span>
            ? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={isPending}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
