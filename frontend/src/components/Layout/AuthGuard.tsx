import { useEffect } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../../hooks/useAuth'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isPending } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'

  useEffect(() => {
    if (!isPending && !isAuthenticated && !isLoginPage) {
      navigate({ to: '/login' })
    }
  }, [isAuthenticated, isPending, navigate, isLoginPage])

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-canvas">
        <div className="w-8 h-8 rounded-full border-2 border-line border-t-accent animate-spin" aria-label="Loading" role="status" />
      </div>
    )
  }

  if (!isAuthenticated && !isLoginPage) return null

  return <>{children}</>
}
