import { useState } from 'react'
import { Link as LinkIcon, Plus } from 'lucide-react'
import { useCreateLink } from '../../hooks/useLinks'

interface Props {
  onOpenPanel: () => void
}

export function QuickCreateBar({ onOpenPanel }: Props) {
  const [url, setUrl] = useState('')
  const createLink = useCreateLink()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    await createLink.mutateAsync({ long_url: url.trim() })
    setUrl('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
      <div className="relative flex-1">
        <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a long URL to shorten..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-shadow"
        />
      </div>
      <button
        type="submit"
        disabled={!url.trim() || createLink.isPending}
        className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {createLink.isPending ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : null}
        Shorten
      </button>
      <button
        type="button"
        onClick={onOpenPanel}
        className="p-2.5 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-primary-400 hover:text-primary-500 text-slate-400 transition-colors"
        title="Advanced options"
      >
        <Plus className="w-5 h-5" />
      </button>
    </form>
  )
}
