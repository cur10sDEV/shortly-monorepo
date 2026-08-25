import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateLink, useUpdateLink } from '../../hooks/useLinks'
import { useFocusTrap } from '../../lib/focusTrap'
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
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, isOpen)

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
        toast.success('Link updated')
      } else {
        await createLink.mutateAsync({
          long_url: longUrl.trim(),
          ...(password ? { password } : {}),
          ...(expiresAt ? { expires_at: new Date(expiresAt).toISOString() } : {}),
        })
        toast.success('Short link created')
      }
      onClose()
    } catch {
      toast.error('Something went wrong')
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={editLink ? 'Edit link' : 'Create link'}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-surface border-l border-line shadow-[var(--shadow-overlay)] z-50 flex flex-col animate-rise"
      >
        <div className="flex items-center justify-between p-6 border-b border-line">
          <h2 className="font-display text-base font-semibold text-ink">
            {editLink ? 'Edit Link' : 'Create Link'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="p-1.5 rounded-lg hover:bg-surface-muted text-ink-muted"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 flex-1">
          <div>
            <label className="block text-[13px] font-medium text-ink mb-1">Long URL</label>
            <input
              type="url"
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
              required
              placeholder="https://example.com/very/long/url"
              className="w-full px-3 py-2 rounded-[var(--radius-control)] border border-line-strong bg-surface text-ink text-sm placeholder:text-ink-faint outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-ink mb-1">
              Password (optional)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Protect your link"
              className="w-full px-3 py-2 rounded-[var(--radius-control)] border border-line-strong bg-surface text-ink text-sm placeholder:text-ink-faint outline-none focus:border-accent transition-colors"
            />
          </div>
          {!editLink && (
            <div>
              <label className="block text-[13px] font-medium text-ink mb-1">
                Expires at (optional)
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 rounded-[var(--radius-control)] border border-line-strong bg-surface text-ink text-sm placeholder:text-ink-faint outline-none focus:border-accent transition-colors"
              />
            </div>
          )}
          {error && (
            <p className="text-sm text-danger">
              {error.message || 'Something went wrong'}
            </p>
          )}
          <div className="mt-auto">
            <button
              type="submit"
              disabled={!longUrl.trim() || isPending}
              className="w-full py-2.5 rounded-[var(--radius-control)] bg-ink text-white dark:text-[#1C1B18] dark:bg-[#EDEAE4] text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40"
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
