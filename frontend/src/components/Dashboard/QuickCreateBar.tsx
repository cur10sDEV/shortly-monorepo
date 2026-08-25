import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateLink } from '../../hooks/useLinks'
import { celebrate } from '../ui/confetti'

interface Props {
  onOpenPanel: () => void
}

export function QuickCreateBar({ onOpenPanel }: Props) {
  const [url, setUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const createLink = useCreateLink()

  // ⌘K "Create new link" command focuses this input
  useEffect(() => {
    const onFocusCreate = () => inputRef.current?.focus()
    window.addEventListener('shortly:focus-create', onFocusCreate)
    return () => window.removeEventListener('shortly:focus-create', onFocusCreate)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    try {
      const result = await createLink.mutateAsync({ long_url: url.trim() })
      celebrate(inputRef.current)
      toast.success(`Short link created: /${result.data.short_code}`)
      setUrl('')
    } catch {
      toast.error('Could not shorten that URL')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-6" aria-label="Quick create link">
      <input
        ref={inputRef}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://paste-a-long-url.com…"
        className="flex-1 px-4 py-2.5 rounded-[var(--radius-control)] border border-line-strong bg-surface text-ink text-sm placeholder:text-ink-faint outline-none focus:border-accent transition-colors"
      />
      <button
        type="submit"
        disabled={!url.trim() || createLink.isPending}
        className="px-5 py-2.5 rounded-[var(--radius-control)] bg-ink text-white dark:text-[#1C1B18] dark:bg-[#EDEAE4] text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Shorten
      </button>
      <button
        type="button"
        onClick={onOpenPanel}
        aria-label="More options (password, expiry)"
        title="Password, expiry…"
        className="px-3 rounded-[var(--radius-control)] border border-dashed border-line-strong hover:border-accent hover:text-accent text-ink-faint transition-colors"
      >
        <Plus className="w-4.5 h-4.5" aria-hidden />
      </button>
    </form>
  )
}
