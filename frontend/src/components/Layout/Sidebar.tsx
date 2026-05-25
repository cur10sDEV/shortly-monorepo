import { Link, useLocation } from '@tanstack/react-router'
import { LayoutDashboard, Link as LinkIcon, BarChart3, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useState } from 'react'

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
    <aside className="w-[var(--sidebar-width)] h-screen sticky top-0 bg-slate-900 dark:bg-slate-950 border-r border-slate-800 dark:border-slate-800 flex flex-col">
      <div className="p-5 border-b border-slate-800">
        <span className="text-lg font-bold text-white tracking-tight">shortly</span>
      </div>
      <nav className="flex-1 p-3 flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-primary-600/15 text-primary-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-slate-800 relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors"
        >
          {user?.image ? (
            <img src={user.image} alt="" className="w-7 h-7 rounded-full" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-semibold">
              {user?.name?.charAt(0) || '?'}
            </div>
          )}
          <span className="text-sm text-slate-300 flex-1 text-left truncate">
            {user?.name || 'User'}
          </span>
        </button>
        {userMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-slate-800 rounded-lg border border-slate-700 shadow-xl z-20">
              <button
                onClick={() => { signOut(); setUserMenuOpen(false) }}
                className="w-full px-3 py-2.5 text-left text-sm text-red-400 hover:bg-slate-700 rounded-lg flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
