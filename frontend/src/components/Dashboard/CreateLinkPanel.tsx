import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useCreateLink, useUpdateLink } from '../../hooks/useLinks'
import type { Link } from '../../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  editLink?: Link | null
}

export function CreateLinkPanel({ isOpen, onClose, editLink }: Props) {
  const [longUrl, setLongUrl] = useState('')
  const [password, setPassword] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const createLink = useCreateLink()
  const updateLink = useUpdateLink()

  useEffect(() => {
    if (editLink) {
      setLongUrl(editLink.long_url)
    } else {
      setLongUrl('')
      setPassword('')
      setExpiresAt('')
    }
  }, [editLink, isOpen])

  const isPending = createLink.isPending || updateLink.isPending
  const error = createLink.error || updateLink.error

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!longUrl.trim()) return

    try {
      if (editLink) {
        await updateLink.mutateAsync({
          id: editLink.id,
          long_url: longUrl.trim(),
          ...(password ? { password } : {}),
        })
      } else {
        await createLink.mutateAsync({
          long_url: longUrl.trim(),
          ...(password ? { password } : {}),
          ...(expiresAt ? { expires_at: new Date(expiresAt).toISOString() } : {}),
        })
      }
      onClose()
    } catch {
      // Error displayed via UI
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold">
            {editLink ? 'Edit Link' : 'Create Link'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 flex-1">
          <div>
            <label className="block text-sm font-medium mb-1">Long URL</label>
            <input
              type="url"
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
              required
              placeholder="https://example.com/very/long/url"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Password (optional)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Protect your link"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          {!editLink && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Expires at (optional)
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          )}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {error.message || 'Something went wrong'}
            </p>
          )}
          <div className="mt-auto">
            <button
              type="submit"
              disabled={!longUrl.trim() || isPending}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isPending
                ? 'Saving...'
                : editLink
                  ? 'Update Link'
                  : 'Create Link'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
