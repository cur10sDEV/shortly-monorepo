import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import type { ThemeChoice } from '../../hooks/useTheme'

const ORDER: ThemeChoice[] = ['light', 'dark', 'system']
const ICONS = { light: Sun, dark: Moon, system: Monitor } as const
const LABELS = { light: 'Light theme', dark: 'Dark theme', system: 'System theme (current)' } as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]
  const Icon = ICONS[theme]

  return (
    <button
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${LABELS[theme]}. Switch to ${next}.`}
      title={LABELS[theme]}
      className="p-2 rounded-lg hover:bg-surface-muted text-ink-muted transition-colors"
    >
      <Icon className="w-4 h-4" aria-hidden />
    </button>
  )
}
