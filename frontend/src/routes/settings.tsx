import { createFileRoute } from '@tanstack/react-router'
import { LogOut, Mail, Monitor, Moon, ShieldCheck, Sun } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import type { ThemeChoice } from '../hooks/useTheme'
import type { CSSProperties } from 'react'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

const THEME_OPTIONS: Array<{ value: ThemeChoice; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

function SettingsPage() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="font-display text-xl font-bold tracking-tight text-ink mb-2">Settings</h1>

      <section aria-labelledby="profile-heading" className="bg-surface border border-line rounded-[var(--radius-card)] p-6 animate-rise">
        <h2 id="profile-heading" className="text-[13px] font-semibold uppercase tracking-wider text-ink-faint mb-5">Profile</h2>
        <div className="flex items-center gap-4">
          {user?.image ? (
            <img src={user.image} alt="" className="w-14 h-14 rounded-full ring-2 ring-line" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-accent grid place-items-center text-white text-xl font-semibold">
              {user?.name.charAt(0) || '?'}
            </div>
          )}
          <div>
            <p className="font-display font-semibold text-ink">{user?.name}</p>
            <p className="text-sm text-ink-muted flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5" aria-hidden />
              {user?.email}
            </p>
          </div>
        </div>
        <div className="border-t border-line mt-5 pt-4 flex items-center gap-2 text-sm text-ink-muted">
          <ShieldCheck className="w-4 h-4 text-green" aria-hidden />
          Signed in with Google SSO
        </div>
      </section>

      <section aria-labelledby="appearance-heading" className="bg-surface border border-line rounded-[var(--radius-card)] p-6 animate-rise" style={{ '--stagger-i': 1 } as CSSProperties}>
        <h2 id="appearance-heading" className="text-[13px] font-semibold uppercase tracking-wider text-ink-faint mb-5">Appearance</h2>
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2 max-w-sm">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              role="radio"
              aria-checked={theme === value}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-colors ${
                theme === value ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink-muted hover:border-line-strong'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="session-heading" className="bg-surface border border-line rounded-[var(--radius-card)] p-6 animate-rise" style={{ '--stagger-i': 2 } as CSSProperties}>
        <h2 id="session-heading" className="text-[13px] font-semibold uppercase tracking-wider text-ink-faint mb-4">Session</h2>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-control)] border border-danger/30 text-danger text-sm font-medium hover:bg-danger-soft transition-colors"
        >
          <LogOut className="w-4 h-4" aria-hidden />
          Sign out
        </button>
      </section>
    </div>
  )
}
