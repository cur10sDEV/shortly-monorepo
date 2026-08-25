import { Outlet, useLocation } from '@tanstack/react-router'
import { useState } from 'react'
import { CommandPalette } from '../ui/CommandPalette'
import { Sidebar } from './Sidebar'

const breadcrumbs: Record<string, string> = {
  '/': 'Dashboard',
  '/links': 'Links',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
}

export function AdminLayout() {
  const location = useLocation()
  const currentPage =
    breadcrumbs[location.pathname] ||
    (location.pathname.endsWith('/analytics')
      ? 'Analytics'
      : Object.entries(breadcrumbs).find(([path]) => location.pathname.startsWith(path))?.[1] ||
        '')
  const [paletteOpen, setPaletteOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main id="main" className="flex-1 p-6 max-w-6xl w-full mx-auto">
          <nav aria-label="Breadcrumb" className="mb-2 text-xs text-ink-faint">
            shortly <span aria-hidden>/</span>{' '}
            <span className="text-ink-muted font-medium">{currentPage}</span>
          </nav>
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}
