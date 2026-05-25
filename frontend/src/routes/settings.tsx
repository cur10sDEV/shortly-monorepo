import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../hooks/useAuth'
import { Mail, ShieldCheck } from 'lucide-react'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Settings</h1>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-5">Profile</h2>
        <div className="flex items-center gap-4 mb-6">
          {user?.image ? (
            <img src={user.image} alt="" className="w-14 h-14 rounded-full ring-2 ring-slate-200 dark:ring-slate-700" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 text-xl font-semibold">
              {user?.name?.charAt(0) || '?'}
            </div>
          )}
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{user?.name}</p>
            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5" />
              {user?.email}
            </p>
          </div>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Signed in with Google SSO
          </div>
        </div>
      </div>
    </div>
  )
}
