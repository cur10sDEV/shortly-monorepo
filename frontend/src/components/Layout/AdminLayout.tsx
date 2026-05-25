import { Outlet, useLocation } from '@tanstack/react-router'
import { Sidebar } from './Sidebar'

const breadcrumbs: Record<string, string> = {
  '/': 'Dashboard',
  '/links': 'Links',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
}

export function AdminLayout() {
  const location = useLocation()
  const currentPage = breadcrumbs[location.pathname] || Object.entries(breadcrumbs)
    .find(([path]) => location.pathname.startsWith(path))?.[1] || ''

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-6 gap-2 text-sm text-slate-500">
          <span>Pages</span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">{currentPage}</span>
        </header>
        <main className="flex-1 p-6 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
