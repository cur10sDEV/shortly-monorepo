import { useEffect } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from '@tanstack/react-router'
import { BarChart3, Copy, LayoutDashboard, Link as LinkIcon, Plus, Settings, SunMoon } from 'lucide-react'
import { toast } from 'sonner'
import { useLinks } from '../../hooks/useLinks'
import { useTheme } from '../../hooks/useTheme'
import { copyToClipboard } from '../../lib/clipboard'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate?: (path: string) => void
}

const PAGES = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/links', label: 'Links', icon: LinkIcon },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export function CommandPalette({ open, onOpenChange, onNavigate }: Props) {
  const navigate = useNavigate()
  const go = onNavigate ?? ((path: string) => navigate({ to: path }))
  const { data } = useLinks()
  const links = data?.data ?? []
  const { theme: choice, setTheme } = useTheme()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const handleCreate = () => {
    go('/')
    onOpenChange(false)
    requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('shortly:focus-create')))
  }

  const handleToggleTheme = () => {
    const next =
      choice === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'light'
          : 'dark'
        : choice === 'dark'
          ? 'light'
          : 'dark'
    setTheme(next)
    onOpenChange(false)
  }

  const handleCopyLink = async (url: string) => {
    if (await copyToClipboard(url)) toast.success('Link copied')
    else toast.error('Could not access the clipboard')
    onOpenChange(false)
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command menu"
      loop
      className="fixed left-1/2 top-[18%] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-overlay)] animate-rise"
      overlayClassName="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
      shouldFilter
    >
      <Command.Input
        placeholder="Type a command or search links…"
        className="w-full bg-transparent px-4 py-3.5 text-sm text-ink placeholder:text-ink-faint outline-none border-b border-line"
      />
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-ink-faint">
          No results found.
        </Command.Empty>

        <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-faint">
          <Item onSelect={handleCreate}>
            <Plus className="h-4 w-4" aria-hidden /> Create new link
            <Shortcut>C</Shortcut>
          </Item>
          <Item onSelect={() => { handleCopyLink(links[0]?.short_url ?? '') }} disabled={links.length === 0}>
            <Copy className="h-4 w-4" aria-hidden /> Copy most recent link
          </Item>
          <Item onSelect={handleToggleTheme}>
            <SunMoon className="h-4 w-4" aria-hidden /> Toggle theme
            <Shortcut>T</Shortcut>
          </Item>
        </Command.Group>

        <Command.Group heading="Pages" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-faint">
          {PAGES.map((p) => (
            <Item key={p.path} onSelect={() => { go(p.path); onOpenChange(false) }}>
              <p.icon className="h-4 w-4" aria-hidden /> {p.label}
            </Item>
          ))}
        </Command.Group>

        {links.length > 0 && (
          <Command.Group heading="Your links" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-faint">
            {links.slice(0, 8).map((l) => (
              <Item key={l.id} value={`${l.short_code} ${l.long_url}`} onSelect={() => handleCopyLink(l.short_url)}>
                <span className="font-mono text-xs font-medium text-accent">{l.short_code}</span>
                <span className="truncate text-xs text-ink-muted">{l.long_url}</span>
              </Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  )
}

function Item({ children, onSelect, disabled, value }: {
  children: ReactNode
  onSelect: () => void
  disabled?: boolean
  value?: string
}) {
  return (
    <Command.Item
      value={value}
      disabled={disabled}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent data-[disabled=true]:opacity-40"
    >
      {children}
    </Command.Item>
  )
}

function Shortcut({ children }: { children: ReactNode }) {
  return (
    <kbd className="ml-auto font-mono text-[10px] text-ink-faint border border-line rounded px-1 py-0.5">
      {children}
    </kbd>
  )
}
