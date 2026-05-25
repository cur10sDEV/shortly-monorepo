# Shortly Frontend + Analytics (Kafka/ES) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React admin dashboard and Kafka + ElasticSearch analytics pipeline for Shortly.

**Architecture:** The frontend is a React SPA with TanStack Router/Query communicating with the API service. Analytics events flow: Redirection Service → Kafka → Consumer (UA parse, geo, dedup) → Elasticsearch → API service (ES aggregations) → Frontend charts (Recharts).

**Tech Stack:** React 19, TanStack Router/Query, Tailwind v4, Recharts, Kafka (KRaft), Elasticsearch, kafkajs, @elastic/elasticsearch, ua-parser-js

---

## File Structure

### New files to create:
```
frontend/
  src/
    lib/api.ts
    types/index.ts
    hooks/useLinks.ts
    hooks/useAnalytics.ts
    hooks/useAuth.ts
    components/Layout/TopBar.tsx
    components/Layout/Sidebar.tsx
    components/Layout/ThemeToggle.tsx
    components/Layout/AuthGuard.tsx
    components/Dashboard/CreateLinkPanel.tsx
    components/Dashboard/LinkListTable.tsx
    components/Dashboard/QuickCreateBar.tsx
    components/Dashboard/DeleteConfirmDialog.tsx
    components/Dashboard/AnalyticsCards.tsx
    components/Analytics/TimelineChart.tsx
    components/Analytics/ReferrersChart.tsx
    components/Analytics/DevicesChart.tsx
    components/Analytics/LocationsTable.tsx
    routes/login.tsx
    routes/settings.tsx
    routes/links_.$id.analytics.tsx

analytics-consumer/
  package.json
  tsconfig.json
  Dockerfile
  .dockerignore
  src/index.ts
  src/lib/kafka.ts
  src/lib/elasticsearch.ts
  src/lib/geoip.ts
  src/lib/parser.ts
  src/types/index.ts
```

### Files to modify:
```
frontend/
  package.json                  # Add recharts
  src/routes/__root.tsx         # New layout
  src/routes/index.tsx          # Dashboard page
  src/components/Header.tsx     # Replace with new layout
  src/lib/auth-client.ts        # Add API base URL
  src/styles.css                # Theme variables

redirection-service/
  package.json                  # Add kafkajs
  src/api/v1/short-url/routes/index.tsx  # Add Kafka publishing
  src/api/v1/utils/env.ts       # Add Kafka broker URL

api-service/
  package.json                  # Add @elastic/elasticsearch
  src/api/v1/app.ts             # Add analytics routes
  src/api/v1/utils/env.ts       # Add ES URL
  src/api/v1/analytics/         # New route directory
    routes/index.ts
    schemas.ts
    queries.ts

docker-compose.yml              # Add Kafka, ES, consumer, frontend
```

---

## Task 1: Frontend — Layout & Auth Infrastructure

**Files:**
- Create: `frontend/src/components/Layout/TopBar.tsx`
- Create: `frontend/src/components/Layout/Sidebar.tsx`
- Create: `frontend/src/components/Layout/ThemeToggle.tsx`
- Create: `frontend/src/components/Layout/AuthGuard.tsx`
- Create: `frontend/src/hooks/useAuth.ts`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/routes/login.tsx`
- Modify: `frontend/src/routes/__root.tsx`
- Modify: `frontend/src/routes/index.tsx`
- Modify: `frontend/src/components/Header.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Create shared TypeScript types**

Write `frontend/src/types/index.ts`:
```typescript
export interface User {
  id: string
  name: string
  email: string
  image?: string
}

export interface Link {
  id: number
  short_code: string
  long_url: string
  password?: string | null
  expires_at?: string | null
  user_id: string
  deleted_at?: string | null
  created_at: string
  updated_at: string
  short_url: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  next_cursor?: number
  has_next: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface AnalyticsSummary {
  total_clicks: number
  unique_clicks: number
  last_click_at: string | null
}

export interface TimelinePoint {
  date: string
  clicks: number
  unique_clicks: number
}

export interface ReferrerStat {
  source: string
  clicks: number
  percentage: number
}

export interface DeviceStat {
  browser: { name: string; clicks: number }[]
  os: { name: string; clicks: number }[]
  device_type: { type: string; clicks: number }[]
}

export interface LocationStat {
  country: string
  city: string
  clicks: number
}
```

- [ ] **Step 2: Create API client**

Write `frontend/src/lib/api.ts`:
```typescript
import { authClient } from './auth-client'
import type {
  ApiResponse,
  Link,
  PaginatedResponse,
  AnalyticsSummary,
  TimelinePoint,
  ReferrerStat,
  DeviceStat,
  LocationStat,
} from '../types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const session = await authClient.getSession()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (session?.data?.session) {
    headers['Authorization'] = `Bearer ${session.data.session.token}`
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export const linksApi = {
  list: (cursor?: number) =>
    fetchApi<PaginatedResponse<Link>>(
      `/user/links${cursor ? `?cursor=${cursor}` : ''}`
    ),
  create: (data: {
    long_url: string
    password?: string
    expires_at?: string
  }) =>
    fetchApi<ApiResponse<Link>>('/short-url/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { long_url?: string; password?: string }) =>
    fetchApi<ApiResponse<Link>>(`/short-url/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<ApiResponse<{ short_code: string }>>(`/short-url/${id}`, {
      method: 'DELETE',
    }),
}

export const analyticsApi = {
  summary: (linkId: number) =>
    fetchApi<ApiResponse<AnalyticsSummary>>(
      `/links/${linkId}/analytics/summary`
    ),
  timeline: (
    linkId: number,
    params?: { from?: string; to?: string; bucket?: string }
  ) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.bucket) qs.set('bucket', params.bucket)
    return fetchApi<ApiResponse<TimelinePoint[]>>(
      `/links/${linkId}/analytics/timeline${qs.toString() ? `?${qs}` : ''}`
    )
  },
  referrers: (linkId: number) =>
    fetchApi<ApiResponse<ReferrerStat[]>>(
      `/links/${linkId}/analytics/referrers`
    ),
  devices: (linkId: number) =>
    fetchApi<ApiResponse<DeviceStat>>(`/links/${linkId}/analytics/devices`),
  locations: (linkId: number) =>
    fetchApi<ApiResponse<LocationStat[]>>(
      `/links/${linkId}/analytics/locations`
    ),
}
```

- [ ] **Step 3: Create auth hook**

Write `frontend/src/hooks/useAuth.ts`:
```typescript
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
      authClient.signIn.social({ provider: 'google' }).then(() => refetch()),
    signOut: () => authClient.signOut().then(() => refetch()),
  }
}
```

- [ ] **Step 4: Create AuthGuard component**

Write `frontend/src/components/Layout/AuthGuard.tsx`:
```typescript
import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '../../hooks/useAuth'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isPending } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isPending && !isAuthenticated) {
      navigate({ to: '/login' })
    }
  }, [isAuthenticated, isPending, navigate])

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return <>{children}</>
}
```

- [ ] **Step 5: Create ThemeToggle component**

Write `frontend/src/components/Layout/ThemeToggle.tsx`:
```typescript
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

type Theme = 'dark' | 'light'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-gray-300" />
      ) : (
        <Moon className="w-5 h-5 text-gray-600" />
      )}
    </button>
  )
}
```

- [ ] **Step 6: Create TopBar component**

Write `frontend/src/components/Layout/TopBar.tsx`:
```typescript
import { useNavigate } from '@tanstack/react-router'
import { LogOut, User } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '../../hooks/useAuth'
import { useState } from 'react'

export function TopBar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <span
          className="text-xl font-bold text-gray-900 dark:text-white cursor-pointer"
          onClick={() => navigate({ to: '/' })}
        >
          Shortly
        </span>
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {user?.image ? (
              <img
                src={user.image}
                alt=""
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            )}
            <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:block">
              {user?.name}
            </span>
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                <button
                  onClick={() => {
                    navigate({ to: '/settings' })
                    setMenuOpen(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Settings
                </button>
                <hr className="border-gray-200 dark:border-gray-700" />
                <button
                  onClick={() => {
                    signOut()
                    setMenuOpen(false)
                    navigate({ to: '/login' })
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 7: Create Sidebar component**

Write `frontend/src/components/Layout/Sidebar.tsx`:
```typescript
import { Link, useLocation } from '@tanstack/react-router'
import { LayoutDashboard, Settings } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 flex flex-col gap-2">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = location.pathname === item.to
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Icon className="w-5 h-5" />
            {item.label}
          </Link>
        )
      })}
    </aside>
  )
}
```

- [ ] **Step 8: Update styles.css with theme variables**

Write `frontend/src/styles.css`:
```css
@import "tailwindcss";

:root {
  font-family: Inter, system-ui, -apple-system, sans-serif;
}

body {
  margin: 0;
}

html {
  color-scheme: light;
}

html.dark {
  color-scheme: dark;
}
```

- [ ] **Step 9: Update root layout**

Replace `frontend/src/routes/__root.tsx`:
```typescript
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { TopBar } from '../components/Layout/TopBar'
import { Sidebar } from '../components/Layout/Sidebar'
import { AuthGuard } from '../components/Layout/AuthGuard'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <AuthGuard>
        <TopBar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </AuthGuard>
      <TanStackDevtools
        config={{ position: 'bottom-right' }}
        plugins={[
          { name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> },
          TanStackQueryDevtools,
        ]}
      />
    </div>
  ),
})
```

- [ ] **Step 10: Create Login route**

Write `frontend/src/routes/login.tsx`:
```typescript
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { isAuthenticated, isPending, signIn } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isPending && isAuthenticated) {
      navigate({ to: '/' })
    }
  }, [isAuthenticated, isPending, navigate])

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
      </div>
    )
  }

  if (isAuthenticated) return null

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg max-w-sm w-full mx-4">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
          Shortly
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-8 text-sm">
          URL Shortener
        </p>
        <button
          onClick={async () => {
            setLoading(true)
            try {
              await signIn()
            } finally {
              setLoading(false)
            }
          }}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 11: Create TanStack Query hooks**

Write `frontend/src/hooks/useLinks.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { linksApi } from '../lib/api'

export function useLinks(cursor?: number) {
  return useQuery({
    queryKey: ['links', cursor],
    queryFn: () => linksApi.list(cursor),
  })
}

export function useCreateLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: linksApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links'] }),
  })
}

export function useUpdateLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; long_url?: string; password?: string }) =>
      linksApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links'] }),
  })
}

export function useDeleteLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: linksApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links'] }),
  })
}
```

Write `frontend/src/hooks/useAnalytics.ts`:
```typescript
import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../lib/api'

export function useAnalyticsSummary(linkId: number) {
  return useQuery({
    queryKey: ['analytics', 'summary', linkId],
    queryFn: () => analyticsApi.summary(linkId),
  })
}

export function useAnalyticsTimeline(
  linkId: number,
  params?: { from?: string; to?: string; bucket?: string }
) {
  return useQuery({
    queryKey: ['analytics', 'timeline', linkId, params],
    queryFn: () => analyticsApi.timeline(linkId, params),
  })
}

export function useAnalyticsReferrers(linkId: number) {
  return useQuery({
    queryKey: ['analytics', 'referrers', linkId],
    queryFn: () => analyticsApi.referrers(linkId),
  })
}

export function useAnalyticsDevices(linkId: number) {
  return useQuery({
    queryKey: ['analytics', 'devices', linkId],
    queryFn: () => analyticsApi.devices(linkId),
  })
}

export function useAnalyticsLocations(linkId: number) {
  return useQuery({
    queryKey: ['analytics', 'locations', linkId],
    queryFn: () => analyticsApi.locations(linkId),
  })
}
```

- [ ] **Step 12: Update index route as placeholder**

Update `frontend/src/routes/index.tsx` to be a placeholder (filled in Task 2):
```typescript
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => <div>Dashboard (Task 2)</div>,
})
```

- [ ] **Step 13: Verify frontend compiles**

Run: `cd /home/cur10sdev/Desktop/coding/tinkering/shortly/frontend && npx tsc --noEmit 2>&1 | head -40`

---

## Task 2: Frontend — Dashboard Components

**Files:**
- Create: `frontend/src/components/Dashboard/CreateLinkPanel.tsx`
- Create: `frontend/src/components/Dashboard/LinkListTable.tsx`
- Create: `frontend/src/components/Dashboard/QuickCreateBar.tsx`
- Create: `frontend/src/components/Dashboard/DeleteConfirmDialog.tsx`
- Create: `frontend/src/components/Dashboard/AnalyticsCards.tsx`
- Modify: `frontend/src/routes/index.tsx`

- [ ] **Step 1: Create QuickCreateBar component**

Write `frontend/src/components/Dashboard/QuickCreateBar.tsx`:
```typescript
import { useState } from 'react'
import { Plus, Link as LinkIcon } from 'lucide-react'
import { useCreateLink } from '../../hooks/useLinks'

interface Props {
  onOpenPanel: () => void
}

export function QuickCreateBar({ onOpenPanel }: Props) {
  const [url, setUrl] = useState('')
  const createLink = useCreateLink()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    await createLink.mutateAsync({ long_url: url.trim() })
    setUrl('')
  }

  return (
    <div className="flex gap-3 mb-6">
      <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a long URL and press Enter..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={!url.trim() || createLink.isPending}
          className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {createLink.isPending ? '...' : 'Shorten'}
        </button>
      </form>
      <button
        onClick={onOpenPanel}
        className="p-2.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Advanced options"
      >
        <Plus className="w-5 h-5 text-gray-400" />
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create LinkListTable component**

Write `frontend/src/components/Dashboard/LinkListTable.tsx`:
```typescript
import { useState } from 'react'
import {
  Copy,
  ExternalLink,
  BarChart3,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { Link } from '../../types'

interface Props {
  links: Link[]
  hasNext: boolean
  hasPrevious: boolean
  onNext: () => void
  onPrevious: () => void
  onEdit: (link: Link) => void
  onDelete: (link: Link) => void
  onAnalytics: (link: Link) => void
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

export function LinkListTable({
  links,
  hasNext,
  hasPrevious,
  onNext,
  onPrevious,
  onEdit,
  onDelete,
  onAnalytics,
}: Props) {
  if (links.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500 dark:text-gray-400">
        <p className="text-lg font-medium">No links yet</p>
        <p className="text-sm mt-1">Create your first short link above</p>
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400">
              <th className="text-left px-4 py-3 font-medium">Short URL</th>
              <th className="text-left px-4 py-3 font-medium">Long URL</th>
              <th className="text-left px-4 py-3 font-medium">Created</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {links.map((link) => (
              <tr
                key={link.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/30"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-600 dark:text-cyan-400 font-mono text-xs">
                      {link.short_code}
                    </span>
                    <button
                      onClick={() => copyToClipboard(link.short_url)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      title="Copy short URL"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 max-w-xs truncate text-gray-600 dark:text-gray-400">
                  {link.long_url}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(link.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onAnalytics(link)}
                      className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      title="View analytics"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(link)}
                      className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(link)}
                      className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2 mt-4">
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create CreateLinkPanel component**

Write `frontend/src/components/Dashboard/CreateLinkPanel.tsx`:
```typescript
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useCreateLink, useUpdateLink } from '../../hooks/useLinks'
import type { Link } from '../../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  editLink?: Link | null
}

export function CreateLinkPanel({ isOpen, onClose, editLink }: Props) {
  const [longUrl, setLongUrl] = useState('')
  const [password, setPassword] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const createLink = useCreateLink()
  const updateLink = useUpdateLink()

  useEffect(() => {
    if (editLink) {
      setLongUrl(editLink.long_url)
    } else {
      setLongUrl('')
      setPassword('')
      setExpiresAt('')
    }
  }, [editLink, isOpen])

  const isPending = createLink.isPending || updateLink.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!longUrl.trim()) return

    if (editLink) {
      await updateLink.mutateAsync({
        id: editLink.id,
        long_url: longUrl.trim(),
        ...(password ? { password } : {}),
      })
    } else {
      await createLink.mutateAsync({
        long_url: longUrl.trim(),
        ...(password ? { password } : {}),
        ...(expiresAt ? { expires_at: new Date(expiresAt).toISOString() } : {}),
      })
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">
            {editLink ? 'Edit Link' : 'Create Link'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 flex-1">
          <div>
            <label className="block text-sm font-medium mb-1">Long URL</label>
            <input
              type="url"
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
              required
              placeholder="https://example.com/very/long/url"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Password (optional)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Protect your link"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>
          {!editLink && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Expires at (optional)
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>
          )}
          <div className="mt-auto">
            <button
              type="submit"
              disabled={!longUrl.trim() || isPending}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isPending
                ? 'Saving...'
                : editLink
                  ? 'Update Link'
                  : 'Create Link'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
```

- [ ] **Step 4: Create DeleteConfirmDialog component**

Write `frontend/src/components/Dashboard/DeleteConfirmDialog.tsx`:
```typescript
import type { Link } from '../../types'

interface Props {
  link: Link | null
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}

export function DeleteConfirmDialog({
  link,
  onConfirm,
  onCancel,
  isPending,
}: Props) {
  if (!link) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onCancel} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6">
          <h3 className="text-lg font-semibold mb-2">Delete Link</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Are you sure you want to delete{' '}
            <span className="font-mono text-cyan-600 dark:text-cyan-400">
              {link.short_code}
            </span>
            ? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={isPending}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 5: Create AnalyticsCards component**

Write `frontend/src/components/Dashboard/AnalyticsCards.tsx`:
```typescript
import { MousePointerClick, Users } from 'lucide-react'
import type { AnalyticsSummary } from '../../types'

interface Props {
  summary: AnalyticsSummary | undefined
  isPending: boolean
}

export function AnalyticsCards({ summary, isPending }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
            <MousePointerClick className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Total Clicks
            </p>
            <p className="text-2xl font-bold">
              {isPending ? '-' : summary?.total_clicks ?? 0}
            </p>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Unique Clicks
            </p>
            <p className="text-2xl font-bold">
              {isPending ? '-' : summary?.unique_clicks ?? 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Wire up Dashboard route**

Replace `frontend/src/routes/index.tsx`:
```typescript
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { QuickCreateBar } from '../components/Dashboard/QuickCreateBar'
import { LinkListTable } from '../components/Dashboard/LinkListTable'
import { CreateLinkPanel } from '../components/Dashboard/CreateLinkPanel'
import { DeleteConfirmDialog } from '../components/Dashboard/DeleteConfirmDialog'
import { useLinks, useDeleteLink } from '../hooks/useLinks'
import type { Link } from '../types'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

function DashboardPage() {
  const [cursor, setCursor] = useState<number | undefined>(undefined)
  const [cursors, setCursors] = useState<number[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<Link | null>(null)
  const [deletingLink, setDeletingLink] = useState<Link | null>(null)
  const { data, isPending } = useLinks(cursor)
  const deleteLink = useDeleteLink()
  const navigate = useNavigate()

  const links = data?.data ?? []
  const hasNext = data?.has_next ?? false

  const handleNext = () => {
    if (data?.next_cursor) {
      setCursors([...cursors, cursor ?? 0])
      setCursor(data.next_cursor)
    }
  }

  const handlePrevious = () => {
    const prev = cursors.pop()
    setCursors([...cursors])
    setCursor(prev)
  }

  const handleEdit = (link: Link) => {
    setEditingLink(link)
    setPanelOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingLink) return
    await deleteLink.mutateAsync(deletingLink.id)
    setDeletingLink(null)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Links</h1>
      <QuickCreateBar onOpenPanel={() => setPanelOpen(true)} />
      <LinkListTable
        links={links}
        hasNext={hasNext}
        hasPrevious={cursors.length > 0}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onEdit={handleEdit}
        onDelete={(link) => setDeletingLink(link)}
        onAnalytics={(link) =>
          navigate({ to: `/links/${link.id}/analytics` })
        }
      />
      <CreateLinkPanel
        isOpen={panelOpen}
        onClose={() => {
          setPanelOpen(false)
          setEditingLink(null)
        }}
        editLink={editingLink}
      />
      <DeleteConfirmDialog
        link={deletingLink}
        onConfirm={handleDelete}
        onCancel={() => setDeletingLink(null)}
        isPending={deleteLink.isPending}
      />
    </div>
  )
}
```

- [ ] **Step 7: Verify frontend compiles**

Run: `cd /home/cur10sdev/Desktop/coding/tinkering/shortly/frontend && npx tsc --noEmit 2>&1 | head -40`

---

## Task 3: Frontend — Settings & Analytics Pages

**Files:**
- Create: `frontend/src/routes/settings.tsx`
- Create: `frontend/src/routes/links_.$id.analytics.tsx`
- Create: `frontend/src/components/Analytics/TimelineChart.tsx`
- Create: `frontend/src/components/Analytics/ReferrersChart.tsx`
- Create: `frontend/src/components/Analytics/DevicesChart.tsx`
- Create: `frontend/src/components/Analytics/LocationsTable.tsx`
- Modify: `frontend/package.json` (add recharts)

- [ ] **Step 1: Add recharts dependency**

Run: `cd /home/cur10sdev/Desktop/coding/tinkering/shortly/frontend && npm install recharts`

- [ ] **Step 2: Create Settings route**

Write `frontend/src/routes/settings.tsx`:
```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../hooks/useAuth'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Profile</h2>
        <div className="flex items-center gap-4 mb-4">
          {user?.image ? (
            <img
              src={user.image}
              alt=""
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700" />
          )}
          <div>
            <p className="font-medium">{user?.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {user?.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create TimelineChart component**

Write `frontend/src/components/Analytics/TimelineChart.tsx`:
```typescript
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import type { TimelinePoint } from '../../types'

interface Props {
  data: TimelinePoint[] | undefined
  isPending: boolean
}

export function TimelineChart({ data, isPending }: Props) {
  if (isPending) return <div className="h-64 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />
  if (!data || data.length === 0) return <p className="text-gray-500 text-sm py-8 text-center">No data yet</p>

  return (
    <ResponsiveContainer width="100%" height={256}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: '#9CA3AF' }}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#F3F4F6',
          }}
        />
        <Line
          type="monotone"
          dataKey="clicks"
          stroke="#06B6D4"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="unique_clicks"
          stroke="#A855F7"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 4: Create ReferrersChart component**

Write `frontend/src/components/Analytics/ReferrersChart.tsx`:
```typescript
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import type { ReferrerStat } from '../../types'

interface Props {
  data: ReferrerStat[] | undefined
  isPending: boolean
}

export function ReferrersChart({ data, isPending }: Props) {
  if (isPending) return <div className="h-48 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />
  if (!data || data.length === 0) return <p className="text-gray-500 text-sm py-6 text-center">No referrer data</p>

  return (
    <ResponsiveContainer width="100%" height={192}>
      <BarChart data={data} layout="vertical">
        <XAxis type="number" tick={{ fontSize: 12, fill: '#9CA3AF' }} />
        <YAxis
          type="category"
          dataKey="source"
          tick={{ fontSize: 12, fill: '#9CA3AF' }}
          width={100}
        />
        <Tooltip
          contentStyle={{
            background: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#F3F4F6',
          }}
        />
        <Bar dataKey="clicks" fill="#06B6D4" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 5: Create DevicesChart component**

Write `frontend/src/components/Analytics/DevicesChart.tsx`:
```typescript
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import type { DeviceStat } from '../../types'

const COLORS = ['#06B6D4', '#A855F7', '#F59E0B', '#10B981', '#EF4444', '#6366F1']

interface Props {
  data: DeviceStat | undefined
  isPending: boolean
}

function pieData(arr: { name?: string; browser?: string; os?: string; clicks: number }[], labelKey: string) {
  return (arr || []).map((item) => ({
    name: item.name || item.browser || item.os || 'Unknown',
    value: item.clicks,
  }))
}

export function DevicesChart({ data, isPending }: Props) {
  if (isPending) return <div className="h-48 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />
  if (!data) return <p className="text-gray-500 text-sm py-6 text-center">No device data</p>

  const browserData = pieData(data.browser, 'browser')
  const osData = pieData(data.os, 'os')

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div>
        <h4 className="text-sm font-medium mb-2">Browsers</h4>
        <ResponsiveContainer width="100%" height={192}>
          <PieChart>
            <Pie data={browserData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={64} label>
              {browserData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2">Operating Systems</h4>
        <ResponsiveContainer width="100%" height={192}>
          <PieChart>
            <Pie data={osData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={64} label>
              {osData.map((_, i) => (
                <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create LocationsTable component**

Write `frontend/src/components/Analytics/LocationsTable.tsx`:
```typescript
import type { LocationStat } from '../../types'

interface Props {
  data: LocationStat[] | undefined
  isPending: boolean
}

export function LocationsTable({ data, isPending }: Props) {
  if (isPending) return <div className="h-32 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />
  if (!data || data.length === 0) return <p className="text-gray-500 text-sm py-6 text-center">No location data</p>

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400">
            <th className="text-left px-4 py-2 font-medium">Country</th>
            <th className="text-left px-4 py-2 font-medium">City</th>
            <th className="text-right px-4 py-2 font-medium">Clicks</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((loc, i) => (
            <tr key={i}>
              <td className="px-4 py-2">{loc.country}</td>
              <td className="px-4 py-2 text-gray-500">{loc.city}</td>
              <td className="px-4 py-2 text-right">{loc.clicks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 7: Create Analytics route**

Write `frontend/src/routes/links_.$id.analytics.tsx`:
```typescript
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useAnalyticsSummary, useAnalyticsTimeline, useAnalyticsReferrers, useAnalyticsDevices, useAnalyticsLocations } from '../hooks/useAnalytics'
import { AnalyticsCards } from '../components/Dashboard/AnalyticsCards'
import { TimelineChart } from '../components/Analytics/TimelineChart'
import { ReferrersChart } from '../components/Analytics/ReferrersChart'
import { DevicesChart } from '../components/Analytics/DevicesChart'
import { LocationsTable } from '../components/Analytics/LocationsTable'

export const Route = createFileRoute('/links/$id/analytics')({
  component: LinkAnalyticsPage,
})

function LinkAnalyticsPage() {
  const { id } = Route.useParams()
  const linkId = Number(id)
  const navigate = useNavigate()
  const summary = useAnalyticsSummary(linkId)
  const timeline = useAnalyticsTimeline(linkId, { bucket: 'day' })
  const referrers = useAnalyticsReferrers(linkId)
  const devices = useAnalyticsDevices(linkId)
  const locations = useAnalyticsLocations(linkId)

  return (
    <div className="max-w-4xl">
      <button
        onClick={() => navigate({ to: '/' })}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>
      <h1 className="text-2xl font-bold mb-6">Link Analytics</h1>
      <AnalyticsCards summary={summary.data?.data} isPending={summary.isPending} />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <h3 className="text-sm font-medium mb-4">Clicks Over Time</h3>
        <TimelineChart data={timeline.data?.data} isPending={timeline.isPending} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium mb-4">Top Referrers</h3>
          <ReferrersChart data={referrers.data?.data} isPending={referrers.isPending} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium mb-4">Devices & OS</h3>
          <DevicesChart data={devices.data?.data} isPending={devices.isPending} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-medium mb-4">Locations</h3>
        <LocationsTable data={locations.data?.data} isPending={locations.isPending} />
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Verify frontend compiles**

Run: `cd /home/cur10sdev/Desktop/coding/tinkering/shortly/frontend && npx tsc --noEmit 2>&1 | head -40`

---

## Task 4: Infrastructure — Kafka + ElasticSearch + Frontend Docker

**Files:**
- Modify: `docker-compose.yml`
- Create: `frontend/Dockerfile`
- Create: `frontend/.dockerignore`

- [ ] **Step 1: Update docker-compose.yml**

Read the current `docker-compose.yml` first. Add Kafka (KRaft mode — no Zookeeper), Elasticsearch, and frontend service.

Add to the root docker-compose.yml:

```yaml
  shortly-kafka:
    container_name: shortly-kafka
    image: apache/kafka:4.0.0
    restart: unless-stopped
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@localhost:9093
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,CONTROLLER:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      CLUSTER_ID: shortly-cluster-001
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_LOG_DIRS: /var/lib/kafka/data
    volumes:
      - shortly-kafka-data:/var/lib/kafka/data
    healthcheck:
      test: ["CMD", "bash", "-c", "echo 'test' | /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list"]
      interval: 15s
      timeout: 5s
      retries: 10

  shortly-elasticsearch:
    container_name: shortly-elasticsearch
    image: elasticsearch:8.17.0
    restart: unless-stopped
    ports:
      - "9200:9200"
    environment:
      discovery.type: single-node
      xpack.security.enabled: "false"
      ES_JAVA_OPTS: -Xms512m -Xmx512m
    volumes:
      - shortly-es-data:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9200/_cluster/health"]
      interval: 15s
      timeout: 10s
      retries: 10

  shortly-analytics-consumer:
    container_name: shortly-analytics-consumer
    build:
      context: ./analytics-consumer
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file: ./envs/.env.consumer
    network_mode: host
    depends_on:
      shortly-kafka:
        condition: service_healthy
      shortly-elasticsearch:
        condition: service_healthy

  shortly-frontend:
    container_name: shortly-frontend
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "3000:3000"
    network_mode: host
```

Add to the volumes section:
```yaml
volumes:
  shortly-kafka-data:
  shortly-es-data:
```

Create `envs/.env.consumer`:
```
KAFKA_BROKER=localhost:9092
KAFKA_GROUP_ID=shortly-analytics-group
KAFKA_TOPIC=shortly-clicks
ES_NODE=http://localhost:9200
ES_INDEX_PREFIX=shortly-clicks
IPAPI_URL=http://ip-api.com/json
```

- [ ] **Step 2: Create frontend Dockerfile**

Write `frontend/Dockerfile`:
```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json .
RUN npm ci --silent

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S -G app app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
USER app
EXPOSE 3000
CMD ["npx", "vite", "preview", "--port", "3000", "--host"]
```

Write `frontend/.dockerignore`:
```
node_modules
dist
.tanstack
.git
*.local
.env
```

- [ ] **Step 3: Verify docker-compose syntax**

Run: `cd /home/cur10sdev/Desktop/coding/tinkering/shortly && docker-compose config --quiet 2>&1 | head -20`

---

## Task 5: Analytics — Kafka Publishing in Redirection Service

**Files:**
- Modify: `redirection-service/package.json`
- Modify: `redirection-service/src/api/v1/utils/env.ts`
- Create: `redirection-service/src/api/v1/lib/kafka.ts`
- Modify: `redirection-service/src/api/v1/short-url/routes/index.tsx`

- [ ] **Step 1: Install kafkajs**

Run: `cd /home/cur10sdev/Desktop/coding/tinkering/shortly/redirection-service && npm install kafkajs`

- [ ] **Step 2: Add Kafka env vars**

Edit `redirection-service/src/api/v1/utils/env.ts`:
```typescript
KAFKA_BROKER: z.string().default('localhost:9092'),
KAFKA_CLICK_TOPIC: z.string().default('shortly-clicks'),
```

- [ ] **Step 3: Create Kafka producer**

Write `redirection-service/src/api/v1/lib/kafka.ts`:
```typescript
import { Kafka } from 'kafkajs'
import { parsedEnv } from '../utils/env.js'
import logger from '../utils/logger.js'

const kafka = new Kafka({
  clientId: parsedEnv.SERVICE_ID,
  brokers: [parsedEnv.KAFKA_BROKER],
})

const producer = kafka.producer()

let connected = false

async function ensureConnected() {
  if (!connected) {
    await producer.connect()
    connected = true
  }
}

export async function publishClickEvent(event: {
  link_id: number
  link_owner_id: string
  ip: string
  user_agent: string
  referrer: string
  timestamp: string
}) {
  try {
    await ensureConnected()
    await producer.send({
      topic: parsedEnv.KAFKA_CLICK_TOPIC,
      messages: [{ value: JSON.stringify(event) }],
    })
  } catch (error) {
    logger.error('KAFKA - Failed to publish click event', error)
  }
}
```

- [ ] **Step 4: Publish event after redirect**

In `redirection-service/src/api/v1/short-url/routes/index.tsx`, after the 302 redirect response in the GET handler, add a fire-and-forget call:

```typescript
import { publishClickEvent } from '../../lib/kafka.js'

// Inside the GET handler, after c.redirect() or c.json() for the redirect:
if (response.status === 302 || response.status === 200) {
  // Don't await — fire and forget
  publishClickEvent({
    link_id: shortUrlData.id,
    link_owner_id: shortUrlData.user_id,
    ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
    user_agent: c.req.header('user-agent') || '',
    referrer: c.req.header('referer') || '',
    timestamp: new Date().toISOString(),
  }).catch(() => {})
}
```

- [ ] **Step 5: Verify TypeScript compilation**

Run: `cd /home/cur10sdev/Desktop/coding/tinkering/shortly/redirection-service && npx tsc --noEmit 2>&1 | head -30`

---

## Task 6: Analytics — Kafka Consumer (Node.js)

**Files:**
- Create: `analytics-consumer/package.json`
- Create: `analytics-consumer/tsconfig.json`
- Create: `analytics-consumer/Dockerfile`
- Create: `analytics-consumer/.dockerignore`
- Create: `analytics-consumer/src/types/index.ts`
- Create: `analytics-consumer/src/lib/kafka.ts`
- Create: `analytics-consumer/src/lib/elasticsearch.ts`
- Create: `analytics-consumer/src/lib/geoip.ts`
- Create: `analytics-consumer/src/lib/parser.ts`
- Create: `analytics-consumer/src/index.ts`

- [ ] **Step 1: Create consumer package.json**

Write `analytics-consumer/package.json`:
```json
{
  "name": "@cur10sdev/shortly-analytics-consumer",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/src/index.js",
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "kafkajs": "^2.2.4",
    "@elastic/elasticsearch": "^8.17.1",
    "ua-parser-js": "^2.0.3"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/ua-parser-js": "^0.7.39",
    "typescript": "^5.7.2",
    "tsx": "^4.19.0"
  }
}
```

- [ ] **Step 2: Create consumer tsconfig.json**

Write `analytics-consumer/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": ".",
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create types**

Write `analytics-consumer/src/types/index.ts`:
```typescript
export interface ClickEvent {
  link_id: number
  link_owner_id: string
  ip: string
  user_agent: string
  referrer: string
  timestamp: string
}

export interface EnrichedClickEvent extends ClickEvent {
  country: string | null
  city: string | null
  browser: string | null
  os: string | null
  device_type: string | null
  is_unique: boolean
}

export interface GeoIpResponse {
  status: string
  country: string
  city: string
}
```

- [ ] **Step 4: Create Kafka consumer client**

Write `analytics-consumer/src/lib/kafka.ts`:
```typescript
import { Kafka, type EachBatchHandler } from 'kafkajs'

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092'
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID || 'shortly-analytics-group'
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'shortly-clicks'

const kafka = new Kafka({
  clientId: 'shortly-analytics-consumer',
  brokers: [KAFKA_BROKER],
})

const consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID })

export async function startConsumer(onBatch: EachBatchHandler) {
  await consumer.connect()
  await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false })
  await consumer.run({
    eachBatchAutoResolve: true,
    batches: 1,
    eachBatch: onBatch,
  })
  console.log(`Kafka consumer started: ${KAFKA_TOPIC}`)
}
```

- [ ] **Step 5: Create ES client**

Write `analytics-consumer/src/lib/elasticsearch.ts`:
```typescript
import { Client } from '@elastic/elasticsearch'

const ES_NODE = process.env.ES_NODE || 'http://localhost:9200'
const ES_INDEX_PREFIX = process.env.ES_INDEX_PREFIX || 'shortly-clicks'

const client = new Client({ node: ES_NODE })

function getIndex(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${ES_INDEX_PREFIX}-${y}.${m}.${d}`
}

export async function indexClickEvent(doc: Record<string, unknown>) {
  const timestamp = (doc.timestamp as string) || new Date().toISOString()
  const index = getIndex(new Date(timestamp))
  await client.index({
    index,
    document: doc,
  })
}
```

- [ ] **Step 6: Create geo IP resolver**

Write `analytics-consumer/src/lib/geoip.ts`:
```typescript
import type { GeoIpResponse } from '../types/index.js'

const IPAPI_URL = process.env.IPAPI_URL || 'http://ip-api.com/json'

export async function resolveGeo(ip: string): Promise<{ country: string | null; city: string | null }> {
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1') {
    return { country: null, city: null }
  }
  try {
    const res = await fetch(`${IPAPI_URL}/${ip}?fields=status,country,city`)
    const data = (await res.json()) as GeoIpResponse
    if (data.status === 'success') {
      return { country: data.country, city: data.city }
    }
  } catch {
    // GeoIP failures are non-critical
  }
  return { country: null, city: null }
}
```

- [ ] **Step 7: Create UA parser**

Write `analytics-consumer/src/lib/parser.ts`:
```typescript
import UAParser from 'ua-parser-js'

export function parseUserAgent(ua: string): {
  browser: string | null
  os: string | null
  device_type: string | null
} {
  if (!ua) return { browser: null, os: null, device_type: null }
  const parser = new UAParser(ua)
  const browser = parser.getBrowser().name || null
  const os = parser.getOS().name || null
  const device = parser.getDevice()
  let deviceType: string | null = 'desktop'
  if (device.type === 'mobile') deviceType = 'mobile'
  else if (device.type === 'tablet') deviceType = 'tablet'
  return { browser, os, device_type: deviceType }
}
```

- [ ] **Step 8: Create main consumer entry point**

Write `analytics-consumer/src/index.ts`:
```typescript
import { startConsumer } from './lib/kafka.js'
import { resolveGeo } from './lib/geoip.js'
import { parseUserAgent } from './lib/parser.js'
import { indexClickEvent } from './lib/elasticsearch.js'
import type { ClickEvent, EnrichedClickEvent } from './types/index.js'

// Simple in-memory dedup: track IP+link_id with timestamps
const dedupWindow = 60 * 60 * 1000 // 1 hour
const dedupCache = new Map<string, number>()

function isUnique(linkId: number, ip: string): boolean {
  const key = `${linkId}:${ip}`
  const now = Date.now()
  const last = dedupCache.get(key)
  if (last && now - last < dedupWindow) return false
  dedupCache.set(key, now)
  return true
}

async function main() {
  await startConsumer(async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary }) => {
    for (const message of batch.messages) {
      if (!message.value) continue
      try {
        const event: ClickEvent = JSON.parse(message.value.toString())
        const { country, city } = await resolveGeo(event.ip)
        const { browser, os, device_type } = parseUserAgent(event.user_agent)
        const unique = isUnique(event.link_id, event.ip)

        const enriched: EnrichedClickEvent = {
          ...event,
          country,
          city,
          browser,
          os,
          device_type,
          is_unique: unique,
        }

        await indexClickEvent(enriched as unknown as Record<string, unknown>)
        await resolveOffset(message.offset)
        await commitOffsetsIfNecessary()
      } catch (error) {
        console.error('Failed to process message', error)
      }
    }
    await heartbeat()
  })
}

main().catch(console.error)
```

- [ ] **Step 9: Create consumer Dockerfile**

Write `analytics-consumer/Dockerfile`:
```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json .
RUN npm ci --silent

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add dumb-init
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/src/index.js"]
```

Write `analytics-consumer/.dockerignore`:
```
node_modules
dist
.git
*.local
```

- [ ] **Step 10: Install and verify consumer**

Run: `cd /home/cur10sdev/Desktop/coding/tinkering/shortly/analytics-consumer && npm install && npx tsc --noEmit 2>&1 | head -30`

---

## Task 7: Analytics — API Endpoints on API Service

**Files:**
- Modify: `api-service/package.json`
- Modify: `api-service/src/api/v1/utils/env.ts`
- Create: `api-service/src/api/v1/analytics/routes/index.ts`
- Create: `api-service/src/api/v1/analytics/schemas.ts`
- Create: `api-service/src/api/v1/analytics/queries.ts`
- Modify: `api-service/src/api/v1/app.ts`

- [ ] **Step 1: Install @elastic/elasticsearch**

Run: `cd /home/cur10sdev/Desktop/coding/tinkering/shortly/api-service && npm install @elastic/elasticsearch`

- [ ] **Step 2: Add ES env vars**

Edit `api-service/src/api/v1/utils/env.ts`:
```typescript
ES_NODE: z.string().url().default('http://localhost:9200'),
ES_INDEX_PREFIX: z.string().default('shortly-clicks'),
```

- [ ] **Step 3: Create ES query helpers**

Write `api-service/src/api/v1/analytics/queries.ts`:
```typescript
import { Client } from '@elastic/elasticsearch'
import { parsedEnv } from '../utils/env.js'

const esClient = new Client({ node: parsedEnv.ES_NODE })

function getIndices(from?: string, to?: string): string[] {
  const prefix = parsedEnv.ES_INDEX_PREFIX
  const indices = [`${prefix}-*`]
  return indices
}

function timeFilter(from?: string, to?: string) {
  const filters: Record<string, unknown>[] = []
  if (from) filters.push({ range: { timestamp: { gte: from } } })
  if (to) filters.push({ range: { timestamp: { lte: to } } })
  return filters
}

export async function getSummary(
  linkId: number,
  linkOwnerId: string,
  from?: string,
  to?: string
) {
  const filters: Record<string, unknown>[] = [
    { term: { link_id: linkId } },
    { term: { link_owner_id: linkOwnerId } },
    ...timeFilter(from, to),
  ]
  const result = await esClient.search({
    index: getIndices(from, to),
    size: 0,
    query: { bool: { filter: filters } },
    aggs: {
      unique_clicks: { cardinality: { field: 'ip' } },
      last_click: { max: { field: 'timestamp' } },
    },
  })
  return {
    total_clicks: (result.hits.total as { value: number }).value || 0,
    unique_clicks: (result.aggregations?.unique_clicks as { value: number })?.value || 0,
    last_click_at: (result.aggregations?.last_click as { value_as_string?: string })?.value_as_string || null,
  }
}

export async function getTimeline(
  linkId: number,
  linkOwnerId: string,
  from?: string,
  to?: string,
  bucket: string = 'day'
) {
  const interval = bucket === 'week' ? '7d' : bucket === 'month' ? '30d' : '1d'
  const filters: Record<string, unknown>[] = [
    { term: { link_id: linkId } },
    { term: { link_owner_id: linkOwnerId } },
    ...timeFilter(from, to),
  ]
  const result = await esClient.search({
    index: getIndices(from, to),
    size: 0,
    query: { bool: { filter: filters } },
    aggs: {
      timeline: {
        date_histogram: {
          field: 'timestamp',
          calendar_interval: interval,
          format: 'yyyy-MM-dd',
        },
        aggs: {
          unique_clicks: { cardinality: { field: 'ip' } },
        },
      },
    },
  })
  const buckets = (result.aggregations?.timeline as { buckets: Array<{ key_as_string: string; doc_count: number; unique_clicks: { value: number } }> })?.buckets || []
  return buckets.map((b) => ({
    date: b.key_as_string,
    clicks: b.doc_count,
    unique_clicks: b.unique_clicks.value,
  }))
}

export async function getReferrers(
  linkId: number,
  linkOwnerId: string,
  from?: string,
  to?: string
) {
  const filters: Record<string, unknown>[] = [
    { term: { link_id: linkId } },
    { term: { link_owner_id: linkOwnerId } },
    ...timeFilter(from, to),
  ]
  const result = await esClient.search({
    index: getIndices(from, to),
    size: 0,
    query: { bool: { filter: filters } },
    aggs: {
      referrers: {
        terms: { field: 'referrer', size: 20 },
      },
    },
  })
  const buckets = (result.aggregations?.referrers as { buckets: Array<{ key: string; doc_count: number }> })?.buckets || []
  const total = buckets.reduce((sum, b) => sum + b.doc_count, 0)
  return buckets.map((b) => ({
    source: b.key || 'Direct',
    clicks: b.doc_count,
    percentage: total > 0 ? Math.round((b.doc_count / total) * 100) : 0,
  }))
}

export async function getDevices(
  linkId: number,
  linkOwnerId: string,
  from?: string,
  to?: string
) {
  const filters: Record<string, unknown>[] = [
    { term: { link_id: linkId } },
    { term: { link_owner_id: linkOwnerId } },
    ...timeFilter(from, to),
  ]
  const result = await esClient.search({
    index: getIndices(from, to),
    size: 0,
    query: { bool: { filter: filters } },
    aggs: {
      browsers: { terms: { field: 'browser', size: 10 } },
      os: { terms: { field: 'os', size: 10 } },
      device_types: { terms: { field: 'device_type', size: 5 } },
    },
  })
  const extract = (agg: string) =>
    ((result.aggregations?.[agg] as { buckets: Array<{ key: string; doc_count: number }> })?.buckets || []).map(
      (b: { key: string; doc_count: number }) => ({ name: b.key, clicks: b.doc_count })
    )
  return {
    browser: extract('browsers'),
    os: extract('os'),
    device_type: extract('device_types'),
  }
}

export async function getLocations(
  linkId: number,
  linkOwnerId: string,
  from?: string,
  to?: string
) {
  const filters: Record<string, unknown>[] = [
    { term: { link_id: linkId } },
    { term: { link_owner_id: linkOwnerId } },
    ...timeFilter(from, to),
  ]
  const result = await esClient.search({
    index: getIndices(from, to),
    size: 0,
    query: { bool: { filter: filters } },
    aggs: {
      locations: {
        terms: { field: 'country', size: 20 },
        aggs: {
          cities: { terms: { field: 'city', size: 5 } },
        },
      },
    },
  })
  const buckets = (result.aggregations?.locations as { buckets: Array<{ key: string; doc_count: number; cities: { buckets: Array<{ key: string; doc_count: number }> } }> })?.buckets || []
  const result2: Array<{ country: string; city: string; clicks: number }> = []
  for (const b of buckets) {
    if (b.cities?.buckets?.length) {
      for (const c of b.cities.buckets) {
        result2.push({ country: b.key, city: c.key, clicks: c.doc_count })
      }
    } else {
      result2.push({ country: b.key, city: 'Unknown', clicks: b.doc_count })
    }
  }
  return result2
}
```

- [ ] **Step 4: Create validation schemas**

Write `api-service/src/api/v1/analytics/schemas.ts`:
```typescript
import { z } from 'zod'

export const analyticsParamsSchema = z.object({
  link_id: z.coerce.number().min(1),
})

export const analyticsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  bucket: z.enum(['day', 'week', 'month']).optional(),
})
```

- [ ] **Step 5: Create analytics routes**

Write `api-service/src/api/v1/analytics/routes/index.ts`:
```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import { analyticsParamsSchema, analyticsQuerySchema } from '../schemas.js'
import { getSummary, getTimeline, getReferrers, getDevices, getLocations } from '../queries.js'

const analyticsRouter = new Hono()

analyticsRouter.get(
  '/:link_id/analytics/summary',
  zValidator('param', analyticsParamsSchema),
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    const { link_id } = c.req.valid('param')
    const { from, to } = c.req.valid('query')
    const user = c.get('user')
    const data = await getSummary(link_id, user.id, from, to)
    return c.json({ success: true, data })
  }
)

analyticsRouter.get(
  '/:link_id/analytics/timeline',
  zValidator('param', analyticsParamsSchema),
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    const { link_id } = c.req.valid('param')
    const { from, to, bucket } = c.req.valid('query')
    const user = c.get('user')
    const data = await getTimeline(link_id, user.id, from, to, bucket)
    return c.json({ success: true, data })
  }
)

analyticsRouter.get(
  '/:link_id/analytics/referrers',
  zValidator('param', analyticsParamsSchema),
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    const { link_id } = c.req.valid('param')
    const { from, to } = c.req.valid('query')
    const user = c.get('user')
    const data = await getReferrers(link_id, user.id, from, to)
    return c.json({ success: true, data })
  }
)

analyticsRouter.get(
  '/:link_id/analytics/devices',
  zValidator('param', analyticsParamsSchema),
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    const { link_id } = c.req.valid('param')
    const { from, to } = c.req.valid('query')
    const user = c.get('user')
    const data = await getDevices(link_id, user.id, from, to)
    return c.json({ success: true, data })
  }
)

analyticsRouter.get(
  '/:link_id/analytics/locations',
  zValidator('param', analyticsParamsSchema),
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    const { link_id } = c.req.valid('param')
    const { from, to } = c.req.valid('query')
    const user = c.get('user')
    const data = await getLocations(link_id, user.id, from, to)
    return c.json({ success: true, data })
  }
)

export { analyticsRouter }
```

- [ ] **Step 6: Register analytics routes in API service**

Edit `api-service/src/api/v1/app.ts`:
```typescript
import { analyticsRouter } from './analytics/routes/index.js'

// Add after existing route registrations:
app.route('/api/v1/links', analyticsRouter)
```

Note: The analytics routes are at `/api/v1/links/:link_id/analytics/...` which runs alongside the existing `/api/v1/short-url/...` routes.

- [ ] **Step 7: Verify TypeScript compilation**

Run: `cd /home/cur10sdev/Desktop/coding/tinkering/shortly/api-service && npx tsc --noEmit 2>&1 | head -30`
