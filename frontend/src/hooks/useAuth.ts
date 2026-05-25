import { authClient } from '../lib/auth-client'

export function useAuth() {
  const { data: session, isPending, error, refetch } = authClient.useSession()
  return {
    user: session?.user ?? null,
    isAuthenticated: !!session?.user,
    isPending,
    error,
    refetch,
    signIn: () =>
      authClient.signIn
        .social({
          provider: 'google',
          callbackURL: window.location.origin,
        })
        .then(() => refetch()),
    signOut: () => authClient.signOut().then(() => refetch()),
  }
}
