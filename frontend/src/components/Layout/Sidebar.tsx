import { Link, useLocation } from '@tanstack/react-router'
import { BarChart3, LayoutDashboard, Link as LinkIcon, LogOut, Settings } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { isNavActive } from '../../lib/nav'
import { ThemeToggle } from './ThemeToggle'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/links', label: 'Links', icon: LinkIcon },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  return (
    <aside className="w-[var(--sidebar-width)] h-screen sticky top-0 bg-surface-muted border-r border-line flex flex-col">
      <div className="px-5 pt-5 pb-4 border-b border-line">
        <Link to="/" className="flex items-center gap-2 group" aria-label="Shortly home">
          <span className="w-6 h-6 rounded-md bg-ink text-canvas grid place-items-center font-display font-bold text-sm group-hover:rotate-6 transition-transform">s</span>
          <span className="font-display text-base font-bold tracking-tight text-ink">shortly<span className="text-accent">*</span></span>
        </Link>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-1" aria-label="Primary">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = isNavActive(item.to, location.pathname)
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-full text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-accent-soft text-accent'
                  : 'text-ink-muted hover:text-ink hover:bg-surface'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-line space-y-1">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="font-mono text-[10px] text-ink-faint select-none">v1 · self-hosted</span>
          <ThemeToggle />
        </div>
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl hover:bg-surface transition-colors"
          >
            {user?.image ? (
              <img src={user.image} alt="" className="w-7 h-7 rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-accent grid place-items-center text-white text-xs font-semibold">
                {user?.name.charAt(0) || '?'}
              </div>
            )}
            <span className="text-[13px] text-ink flex-1 text-left truncate">{user?.name || 'User'}</span>
          </button>
          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} aria-hidden />
              <div role="menu" className="absolute bottom-full left-0 right-0 mb-2 bg-surface rounded-xl border border-line shadow-[var(--shadow-overlay)] z-20 overflow-hidden animate-rise">
                <p className="px-3 pt-2.5 pb-1 text-[11px] text-ink-faint truncate">{user?.email}</p>
                <button
                  onClick={() => { signOut(); setUserMenuOpen(false) }}
                  className="w-full px-3 py-2.5 text-left text-[13px] text-danger hover:bg-danger-soft flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" aria-hidden /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
