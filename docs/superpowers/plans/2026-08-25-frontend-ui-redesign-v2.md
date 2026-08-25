# Shortly UI Redesign v2 — "Warm Paper / Dev-tool" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Shortly frontend into a distinctive Warm Paper / dev-tool styled app with ⌘K palette, QR popovers, sparklines, toasts, count-ups and confetti — plus one new api-service endpoint (`GET /user/analytics/overview`) that powers real dashboard stats and sparklines.

**Architecture:** Design tokens live in `frontend/src/styles.css` as CSS custom properties exposed to Tailwind v4 via `@theme inline` (light values in `:root`, "Warm Ink" overrides in `.dark`). All components consume semantic utility classes (`bg-canvas`, `text-ink`, `border-line`) — never raw hex. New UI primitives are small focused files under `src/components/ui/`. Backend addition follows the existing api-service pattern: data-access function (PG) + ES aggregation in `analytics/queries.ts` + route in `user/routes/index.ts`.

**Tech Stack:** React 19 · TanStack Router/Query · Tailwind v4 · Vitest+Testing Library · cmdk · sonner · qrcode.react · canvas-confetti · @fontsource (Space Grotesk Variable, Inter Variable, JetBrains Mono) | api-service: Hono · pg · @elastic/elasticsearch · vitest

**Spec:** `docs/superpowers/specs/2026-08-25-frontend-ui-redesign-v2.md`

**Branch:** create `feat/ui-redesign-v2` from `main` before Task 1.

---

## File Structure Map

```
frontend/
  src/
    styles.css                                  # MODIFY — tokens, fonts, motion, a11y base
    main.tsx                                    # MODIFY — font imports? no: styles.css imports fonts; add <Toaster/> here
    lib/api.ts                                  # MODIFY — analyticsApi.overview()
    lib/linkStatus.ts                           # CREATE — pure status derivation
    lib/motion.ts                               # CREATE — prefersReducedMotion(), easing const
    hooks/useTheme.ts                           # CREATE — light/dark/system theme store
    hooks/useOverview.ts                        # CREATE — React Query wrapper for overview endpoint
    types/index.ts                              # MODIFY — UserOverview types
    components/ui/CountUp.tsx                   # CREATE
    components/ui/Sparkline.tsx                 # CREATE
    components/ui/StatTile.tsx                  # CREATE
    components/ui/Skeleton.tsx                  # CREATE
    components/ui/EmptyState.tsx                # CREATE
    components/ui/confetti.ts                   # CREATE — burst util (reduced-motion aware)
    components/ui/CommandPalette.tsx            # CREATE — cmdk dialog + global hotkey
    components/ui/QRPopover.tsx                 # CREATE
    components/Dashboard/LinkCardList.tsx       # CREATE (replaces LinkListTable)
    components/Dashboard/LinkListTable.tsx      # DELETE (Task 27)
    components/Layout/AdminLayout.tsx           # MODIFY — canvas bg, breadcrumb, palette mount
    components/Layout/Sidebar.tsx               # MODIFY — Warm Paper reskin, footer block
    components/Layout/ThemeToggle.tsx           # MODIFY — uses useTheme
    components/Dashboard/QuickCreateBar.tsx     # MODIFY — reskin + confetti/toast
    components/Dashboard/CreateLinkPanel.tsx    # MODIFY — reskin + focus trap + toast
    components/Dashboard/DeleteConfirmDialog.tsx# MODIFY — reskin + focus trap
    routes/index.tsx                            # MODIFY — dashboard assembly w/ overview
    routes/links.tsx                            # MODIFY — search/filter pills
    routes/login.tsx                            # MODIFY — redesign
    routes/settings.tsx                         # MODIFY — profile/theme/danger cards
    routes/links_.$id.analytics.tsx             # MODIFY — range pills, tiles, restyled charts
    routes/demo/tanstack-query.tsx              # DELETE (Task 27)
api-service/
  src/api/v1/user/data-access/index.ts          # MODIFY — getUserOverviewLinks()
  src/api/v1/analytics/queries.ts               # MODIFY — getOverviewClicks()
  src/api/v1/user/routes/index.ts               # MODIFY — GET /analytics/overview
  src/api/v1/user/data-access/index.test.ts     # CREATE
  src/api/v1/analytics/queries.test.ts          # CREATE
```

Test infra notes:
- frontend has `vitest`, `jsdom`, `@testing-library/{react,dom}` but NO vitest config or setup file and NO jest-dom — Task 1 adds `@testing-library/jest-dom`; Task 2 creates config.
- api-service has vitest configured (`environment: 'node'`, globals). No tests exist yet; we mock `pg` pool and ES `Client` with `vi.mock`.
- Frontend commands run in `frontend/`, api-service commands in `api-service/` (each has own node_modules).

---

## Phase A — Foundations

### Task 1: Install dependencies

**Files:** none created; `frontend/package.json`, `frontend/package-lock.json` modified by npm.

- [ ] **Step 1: Create branch**

```bash
git checkout -b feat/ui-redesign-v2
```

- [ ] **Step 2: Install runtime deps**

```bash
npm install @fontsource-variable/space-grotesk @fontsource-variable/inter @fontsource/jetbrains-mono cmdk sonner qrcode.react canvas-confetti
```

- [ ] **Step 3: Install dev deps**

```bash
npm install -D @types/canvas-confetti @testing-library/jest-dom
```

- [ ] **Step 4: Verify install**

Run: `node -e "['cmdk','sonner','qrcode.react','canvas-confetti'].forEach(p=>console.log(p,require.resolve(p)))"`
Expected: four resolved paths, no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): add ui redesign dependencies"
```

### Task 2: Design tokens, fonts, motion + a11y base styles

**Files:**
- Modify: `frontend/src/styles.css` (full rewrite)

- [ ] **Step 1: Replace `styles.css` content entirely with:**

```css
@import "tailwindcss";
@import "@fontsource-variable/space-grotesk";
@import "@fontsource-variable/inter";
@import "@fontsource/jetbrains-mono/400.css";
@import "@fontsource/jetbrains-mono/500.css";
@import "@fontsource/jetbrains-mono/600.css";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  --paper-canvas: #F8F7F4;
  --paper-surface: #FFFFFF;
  --paper-surface-muted: #F3F1EC;
  --paper-line: #E8E5DE;
  --paper-line-strong: #D9D5CC;
  --paper-ink: #37352F;
  --paper-ink-muted: #787774;
  --paper-ink-faint: #A19F97;
  --paper-accent: #4F46E5;
  --paper-accent-strong: #4338CA;
  --paper-accent-soft: #EEF0FF;
  --paper-teal: #0D9488;
  --paper-green: #0F7B6C;
  --paper-green-soft: #EDF7F3;
  --paper-amber: #B45309;
  --paper-amber-soft: #FBF3E8;
  --paper-red: #DC2626;
  --paper-red-soft: #FDECEC;
  --paper-purple: #7C3AED;
  --paper-purple-soft: #F3EEFD;
  --paper-ring: #818CF8;
  --shadow-card-hover: 0 10px 24px -8px rgba(28, 27, 24, 0.16);
  --shadow-overlay: 0 16px 40px -12px rgba(28, 27, 24, 0.25);
}

.dark {
  --paper-canvas: #1C1B18;
  --paper-surface: #262421;
  --paper-surface-muted: #211F1C;
  --paper-line: #38352F;
  --paper-line-strong: #454138;
  --paper-ink: #EDEAE4;
  --paper-ink-muted: #A8A49B;
  --paper-ink-faint: #6E6A62;
  --paper-accent: #818CF8;
  --paper-accent-strong: #A5B4FC;
  --paper-accent-soft: rgba(129, 140, 248, 0.14);
  --paper-teal: #2DD4BF;
  --paper-green: #34D399;
  --paper-green-soft: rgba(52, 211, 153, 0.12);
  --paper-amber: #FBBF24;
  --paper-amber-soft: rgba(251, 191, 36, 0.12);
  --paper-red: #F87171;
  --paper-red-soft: rgba(248, 113, 113, 0.12);
  --paper-purple: #A78BFA;
  --paper-purple-soft: rgba(167, 139, 250, 0.14);
  --paper-ring: #A5B4FC;
  --shadow-card-hover: 0 10px 24px -8px rgba(0, 0, 0, 0.5);
  --shadow-overlay: 0 16px 40px -12px rgba(0, 0, 0, 0.6);
}

@theme inline {
  --font-display: "Space Grotesk Variable", ui-sans-serif, sans-serif;
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --color-canvas: var(--paper-canvas);
  --color-surface: var(--paper-surface);
  --color-surface-muted: var(--paper-surface-muted);
  --color-line: var(--paper-line);
  --color-line-strong: var(--paper-line-strong);
  --color-ink: var(--paper-ink);
  --color-ink-muted: var(--paper-ink-muted);
  --color-ink-faint: var(--paper-ink-faint);
  --color-accent: var(--paper-accent);
  --color-accent-strong: var(--paper-accent-strong);
  --color-accent-soft: var(--paper-accent-soft);
  --color-teal: var(--paper-teal);
  --color-green: var(--paper-green);
  --color-green-soft: var(--paper-green-soft);
  --color-amber-warm: var(--paper-amber);
  --color-amber-soft: var(--paper-amber-soft);
  --color-danger: var(--paper-red);
  --color-danger-soft: var(--paper-red-soft);
  --color-protected: var(--paper-purple);
  --color-protected-soft: var(--paper-purple-soft);

  --radius-card: 10px;
  --radius-control: 8px;
}

:root {
  font-family: var(--font-sans);
  color: var(--paper-ink);
  --sidebar-width: 232px;
}

body {
  margin: 0;
  background-color: var(--paper-canvas);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

html { color-scheme: light; }
html.dark { color-scheme: dark; }

:focus-visible {
  outline: 2px solid var(--paper-ring);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Motion language */
:root {
  --ease-out-soft: cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes rise-in {
  from { opacity: 0; transform: translateY(14px) scale(0.98); }
  to { opacity: 1; transform: none; }
}

.animate-rise {
  opacity: 0;
  animation: rise-in 480ms var(--ease-out-soft) forwards;
  animation-delay: calc(var(--stagger-i, 0) * 40ms);
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.shimmer {
  background: linear-gradient(90deg, var(--paper-surface-muted) 25%, var(--paper-canvas) 50%, var(--paper-surface-muted) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
}

.hover-lift {
  transition: transform 180ms var(--ease-out-soft), box-shadow 180ms var(--ease-out-soft), border-color 180ms var(--ease-out-soft);
}
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .animate-rise { opacity: 1; animation: none; }
}
```

Note: `amber-warm` avoids colliding with Tailwind's built-in `amber` scale; `green`/`teal` intentionally override built-ins within this app since nothing references built-in scales after this task.

- [ ] **Step 2: Verify Tailwind generates utilities**

Run: `cd frontend && npm run build`
Expected: build succeeds. If it fails on unknown at-rules, confirm `@custom-variant` line is directly after imports.

- [ ] **Step 3: Visual smoke check**

Run: `cd frontend && npm run dev` — open http://localhost:3000. Pages look unstyled-brown-ish (old slate classes remain) but background is warm paper and fonts render as Space Grotesk headings / Inter body. Stop server.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/styles.css
git commit -m "feat(frontend): warm paper design tokens, self-hosted fonts, motion + a11y base"
```

### Task 3: Frontend test infrastructure

**Files:**
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test/setup.ts`

- [ ] **Step 1: Create `frontend/vitest.config.ts`:**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
```

- [ ] **Step 2: Create `frontend/src/test/setup.ts`:**

```ts
import '@testing-library/jest-dom/vitest'

// jsdom lacks matchMedia — needed by useTheme/motion utils
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}
```

(`@vitejs/plugin-react` is already in devDependencies.)

- [ ] **Step 3: Verify runner works**

Create throwaway check then delete:

```bash
mkdir -p frontend/src/test && cat > frontend/src/test/sanity.test.tsx <<'EOF'
import { describe, it, expect } from 'vitest'
describe('sanity', () => { it('runs', () => expect(1).toBe(1)) })
EOF
cd frontend && npm test
rm src/test/sanity.test.tsx
```

Expected: `1 passed`. (Keep the directory + setup file.)

- [ ] **Step 4: Commit**

```bash
git add frontend/vitest.config.ts frontend/src/test/setup.ts
git commit -m "test(frontend): vitest jsdom config with testing-library setup"
```

---

## Phase B — Backend: overview endpoint (TDD)

### Task 4: PG data-access `getUserOverviewLinks`

**Files:**
- Modify: `api-service/src/api/v1/user/data-access/index.ts`
- Test: `api-service/src/api/v1/user/data-access/index.test.ts`

- [ ] **Step 1: Write failing test**

Create `api-service/src/api/v1/user/data-access/index.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
const mockRelease = vi.fn()

vi.mock('../../db/index.js', () => ({
  pool: { connect: async () => ({ query: mockQuery, release: mockRelease }) },
}))

import { getUserOverviewLinks } from './index.js'

describe('getUserOverviewLinks', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockRelease.mockReset()
  })

  it('returns totals and recent links', async () => {
    mockQuery.mockImplementation(({ text }: { text: string }) => {
      if (text.includes('COUNT')) {
        return Promise.resolve({ rows: [{ total_links: '128', active_links: '121' }] })
      }
      return Promise.resolve({ rows: [{ id: 42, short_code: '9xKp' }] })
    })

    const result = await getUserOverviewLinks('user-1')
    expect(result).toEqual({
      total_links: 128,
      active_links: 121,
      recent_links: [{ id: 42, short_code: '9xKp' }],
    })
  })

  it('numbers come back as numbers not strings', async () => {
    mockQuery.mockImplementation(({ text }: { text: string }) =>
      text.includes('COUNT')
        ? Promise.resolve({ rows: [{ total_links: '0', active_links: '0' }] })
        : Promise.resolve({ rows: [] }),
    )
    const result = await getUserOverviewLinks('user-2')
    expect(result?.total_links).toBe(0)
    expect(result?.active_links).toBe(0)
    expect(result?.recent_links).toEqual([])
  })

  it('returns null on db error', async () => {
    mockQuery.mockRejectedValue(new Error('boom'))
    const result = await getUserOverviewLinks('user-3')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `cd api-service && npx vitest run src/api/v1/user/data-access/index.test.ts`
Expected: FAIL — `getUserOverviewLinks` not exported.

- [ ] **Step 3: Implement**

Append to `api-service/src/api/v1/user/data-access/index.ts`:

```ts
const RECENT_LINKS_LIMIT = 100

export interface IUserOverviewLinks {
  total_links: number
  active_links: number
  recent_links: Array<{ id: number; short_code: string }>
}

export const getUserOverviewLinks = async (
  user_id: string,
): Promise<IUserOverviewLinks | null> => {
  const client = await pool.connect()
  try {
    const totals = await client.query<{ total_links: string; active_links: string }>({
      name: 'user-overview-totals',
      text: `SELECT
               COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total_links,
               COUNT(*) FILTER (WHERE deleted_at IS NULL AND (expires_at IS NULL OR expires_at > now())) AS active_links
             FROM links WHERE user_id = $1`,
      values: [user_id],
    })
    const recent = await client.query<{ id: number; short_code: string }>({
      name: 'user-overview-recent',
      text: 'SELECT id, short_code FROM links WHERE user_id = $1 AND deleted_at IS NULL ORDER BY id DESC LIMIT $2',
      values: [user_id, RECENT_LINKS_LIMIT],
    })
    return {
      total_links: Number(totals.rows[0]?.total_links ?? 0),
      active_links: Number(totals.rows[0]?.active_links ?? 0),
      recent_links: recent.rows,
    }
  } catch (error) {
    logger.error('DB ERROR: getUserOverviewLinks', error)
    return null
  } finally {
    client.release()
  }
}
```

- [ ] **Step 4: Run tests to green**

Run: `cd api-service && npx vitest run src/api/v1/user/data-access/index.test.ts`
Expected: 3 PASS.

- [ ] **Step 5: Lint**

Run: `cd api-service && npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add api-service/src/api/v1/user/data-access/
git commit -m "feat(api): user overview totals + recent links data access"
```

### Task 5: ES aggregation `getOverviewClicks`

**Files:**
- Modify: `api-service/src/api/v1/analytics/queries.ts`
- Test: `api-service/src/api/v1/analytics/queries.test.ts`

- [ ] **Step 1: Write failing test**

Create `api-service/src/api/v1/analytics/queries.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

type SearchArgs = Record<string, unknown>
const mockSearch = vi.fn<(args: SearchArgs) => Promise<Record<string, any>>>()

vi.mock('@elastic/elasticsearch', () => ({
  Client: class {
    search = (args: SearchArgs) => mockSearch(args)
  },
}))

vi.mock('../utils/env.js', () => ({
  parsedEnv: { ES_NODE: 'http://localhost:9200', ES_INDEX_PREFIX: 'clicks' },
}))

import { getOverviewClicks } from './queries.js'

function dayStrings(count: number): string[] {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return Array.from({ length: count }, (_, i) =>
    new Date(startOfToday.getTime() + i * 86_400_000).toISOString().slice(0, 10),
  )
}

describe('getOverviewClicks', () => {
  beforeEach(() => mockSearch.mockReset())

  it('returns empty array when no link ids', async () => {
    const result = await getOverviewClicks('owner-1', [])
    expect(result).toEqual([])
    expect(mockSearch).not.toHaveBeenCalled()
  })

  it('maps buckets and backfills missing days with zeros', async () => {
    const days = dayStrings(14)
    mockSearch.mockResolvedValue({
      hits: { total: { value: 10 } },
      aggregations: {
        by_link_series: {
          inner: {
            buckets: [
              {
                key: 42,
                series: {
                  buckets: [
                    { key_as_string: days[13], doc_count: 7 },
                    { key_as_string: days[10], doc_count: 3 },
                  ],
                },
              },
            ],
          },
        },
        by_link_total: { inner: { buckets: [{ key: 42, doc_count: 812 }] } },
      },
    })

    const result = await getOverviewClicks('owner-1', [42])
    expect(result).toHaveLength(1)
    const link = result[0]
    expect(link.link_id).toBe(42)
    expect(link.clicks_total).toBe(812)
    expect(link.clicks_14d).toHaveLength(14)
    expect(link.clicks_14d[13]).toBe(7)
    expect(link.clicks_14d[10]).toBe(3)
    expect(link.clicks_14d[12]).toBe(0) // backfilled
  })

  it('returns zeros for link with no es bucket', async () => {
    mockSearch.mockResolvedValue({
      hits: { total: { value: 0 } },
      aggregations: {
        by_link_series: { inner: { buckets: [] } },
        by_link_total: { inner: { buckets: [] } },
      },
    })
    const result = await getOverviewClicks('owner-1', [7])
    expect(result[0]).toEqual({ link_id: 7, clicks_total: 0, clicks_14d: Array(14).fill(0) })
  })
})
```

Why this shape: all-time totals need docs outside the 14-day window, so owner/id/time filters cannot live at query level — each aggregation carries its own `filter` agg instead (`by_link_series` adds the time range, `by_link_total` doesn't).

- [ ] **Step 2: Verify failure**

Run: `cd api-service && npx vitest run src/api/v1/analytics/queries.test.ts`
Expected: FAIL — `getOverviewClicks` is not exported.

- [ ] **Step 3: Implement — append to `queries.ts`:**

```ts
export interface IOverviewLinkClicks {
  link_id: number
  clicks_total: number
  clicks_14d: number[]
}

const OVERVIEW_WINDOW_DAYS = 14
const OVERVIEW_MAX_LINKS = 100

function overviewWindow(): { days: string[]; min: string; max: string; gteIso: string } {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const days: string[] = []
  for (let i = OVERVIEW_WINDOW_DAYS - 1; i >= 0; i--) {
    days.push(new Date(startOfToday.getTime() - i * 86_400_000).toISOString().slice(0, 10))
  }
  return {
    days,
    min: days[0],
    max: days[days.length - 1],
    gteIso: new Date(startOfToday.getTime() - (OVERVIEW_WINDOW_DAYS - 1) * 86_400_000).toISOString(),
  }
}

export async function getOverviewClicks(
  linkOwnerId: string,
  linkIds: number[],
): Promise<IOverviewLinkClicks[]> {
  if (linkIds.length === 0) return []

  const window = overviewWindow()

  const result = await esClient.search({
    index: getIndices(),
    size: 0,
    query: { match_all: {} },
    aggs: {
      by_link_series: {
        filter: {
          bool: {
            filter: [
              { term: { 'link_owner_id.keyword': linkOwnerId } },
              { terms: { link_id: linkIds } },
              { range: { timestamp: { gte: window.gteIso } } },
            ],
          },
        },
        aggs: {
          inner: {
            terms: { field: 'link_id', size: OVERVIEW_MAX_LINKS },
            aggs: {
              series: {
                date_histogram: {
                  field: 'timestamp',
                  calendar_interval: 'day',
                  format: 'yyyy-MM-dd',
                  min_doc_count: 0,
                  extended_bounds: { min: window.min, max: window.max },
                  time_zone: '+00:00',
                },
              },
            },
          },
        },
      },
      by_link_total: {
        filter: {
          bool: {
            filter: [
              { term: { 'link_owner_id.keyword': linkOwnerId } },
              { terms: { link_id: linkIds } },
            ],
          },
        },
        aggs: { inner: { terms: { field: 'link_id', size: OVERVIEW_MAX_LINKS } } },
      },
    },
  })

  type SeriesBucket = { key_as_string: string; doc_count: number }
  type LinkBucket = { key: number; doc_count: number; series?: { buckets: SeriesBucket[] } }
  type OverviewAggs = {
    by_link_series?: { inner?: { buckets?: LinkBucket[] } }
    by_link_total?: { inner?: { buckets?: LinkBucket[] } }
  }

  const aggs = (result.aggregations ?? {}) as OverviewAggs

  const seriesByLink = new Map<number, SeriesBucket[]>()
  for (const b of aggs.by_link_series?.inner?.buckets ?? []) {
    if (b.series?.buckets) seriesByLink.set(b.key, b.series.buckets)
  }
  const totalsByLink = new Map<number, number>()
  for (const b of aggs.by_link_total?.inner?.buckets ?? []) {
    totalsByLink.set(b.key, b.doc_count)
  }

  return linkIds.map((id) => {
    const seriesBuckets = seriesByLink.get(id) ?? []
    const byDay = new Map(seriesBuckets.map((b) => [b.key_as_string, b.doc_count]))
    return {
      link_id: id,
      clicks_total: totalsByLink.get(id) ?? 0,
      clicks_14d: window.days.map((day) => byDay.get(day) ?? 0),
    }
  })
}
```

Note: total_clicks is computed by the route as the sum of per-link totals over the most recent 100 links — a documented scale limitation, acceptable for this project.

- [ ] **Step 4: Run tests to green**

Run: `cd api-service && npx vitest run src/api/v1/analytics/queries.test.ts`
Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add api-service/src/api/v1/analytics/
git commit -m "feat(api): per-link click aggregates via single ES filtered-aggs query"
```

### Task 6: Route `GET /user/analytics/overview`

**Files:**
- Modify: `api-service/src/api/v1/user/routes/index.ts`

- [ ] **Step 1: Add imports at top of file**

```ts
import { getUserLinks, getUserOverviewLinks } from '../data-access/index.js'
import { getOverviewClicks } from '../../analytics/queries.js'
```

(merge with existing import lines — `getUserLinks` already imported)

- [ ] **Step 2: Add route below the existing `/links` route**

```ts
userRouter.get('/analytics/overview', async (c) => {
  const user = c.get('user')

  const overviewLinks = await getUserOverviewLinks(user.id)
  if (overviewLinks === null) {
    throw new HTTPException(500, { message: 'Failed to load overview' })
  }

  const linkIds = overviewLinks.recent_links.map((l) => l.id)
  let clicksByLink = new Map<number, { clicks_total: number; clicks_14d: number[] }>()
  try {
    const aggregates = await getOverviewClicks(
      user.id,
      linkIds,
    )
    clicksByLink = new Map(aggregates.map((a) => [a.link_id, a]))
  } catch (error) {
    logger.error('ES ERROR: overview aggregates failed, serving zeroed series', error)
  }

  const per_link = overviewLinks.recent_links.map((l) => ({
    link_id: l.id,
    short_code: l.short_code,
    ...(clicksByLink.get(l.id) ?? { clicks_total: 0, clicks_14d: Array<number>(14).fill(0) }),
  }))

  c.status(200)
  return c.json({
    success: true,
    data: {
      totals: {
        total_links: overviewLinks.total_links,
        active_links: overviewLinks.active_links,
        total_clicks: per_link.reduce((sum, p) => sum + p.clicks_total, 0),
      },
      per_link,
    },
  })
})
```

Add `logger` import: `import logger from '../../utils/logger.js'`.

Degradation behavior: if ES is down the endpoint still returns 200 with zeroed click data — dashboard renders tiles/PG counts and empty sparklines instead of erroring.

- [ ] **Step 3: Typecheck + lint**

Run: `cd api-service && npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add api-service/src/api/v1/user/routes/index.ts
git commit -m "feat(api): GET /user/analytics/overview endpoint"
```

---

## Phase C — Frontend primitives (TDD)

### Task 7: Types, api client method, `useOverview` hook

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/hooks/useOverview.ts`

- [ ] **Step 1: Append to `frontend/src/types/index.ts`:**

```ts
export interface OverviewTotals {
  total_links: number
  total_clicks: number
  active_links: number
}

export interface OverviewLinkStat {
  link_id: number
  short_code: string
  clicks_total: number
  clicks_14d: number[]
}

export interface UserOverview {
  totals: OverviewTotals
  per_link: OverviewLinkStat[]
}
```

- [ ] **Step 2: Add to `analyticsApi` in `frontend/src/lib/api.ts`:**

```ts
import type { UserOverview } from '../types'

// inside analyticsApi:
  overview: () =>
    fetchApi<ApiResponse<UserOverview>>(`/user/analytics/overview`),
```

- [ ] **Step 3: Create `frontend/src/hooks/useOverview.ts`:**

```ts
import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../lib/api'

export function useOverview() {
  return useQuery({
    queryKey: ['overview'],
    queryFn: () => analyticsApi.overview(),
    staleTime: 60_000,
    retry: 1,
  })
}
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts frontend/src/hooks/useOverview.ts
git commit -m "feat(frontend): overview types, api client method, useOverview hook"
```

### Task 8: motion utilities

**Files:**
- Create: `frontend/src/lib/motion.ts`
- Test: `frontend/src/lib/motion.test.ts`

- [ ] **Step 1: Write failing test — `frontend/src/lib/motion.test.ts`:**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { prefersReducedMotion } from './motion'

describe('prefersReducedMotion', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns true when user prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') }))
    expect(prefersReducedMotion()).toBe(true)
  })

  it('returns false otherwise', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    expect(prefersReducedMotion()).toBe(false)
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `cd frontend && npx vitest run src/lib/motion.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `frontend/src/lib/motion.ts`:**

```ts
export const EASE_OUT_SOFT = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
```

- [ ] **Step 4: Run tests**

Run: `cd frontend && npx vitest run src/lib/motion.test.ts`
Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/motion.ts frontend/src/lib/motion.test.ts
git commit -m "feat(frontend): motion utilities"
```

### Task 9: `CountUp`

**Files:**
- Create: `frontend/src/components/ui/CountUp.tsx`
- Test: `frontend/src/components/ui/CountUp.test.tsx`

- [ ] **Step 1: Write failing test:**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CountUp } from './CountUp'

describe('CountUp', () => {
  it('renders final value when reduced motion preferred', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') }))
    render(<CountUp value={48204} />)
    expect(screen.getByText('48,204')).toBeInTheDocument()
  })

  it('renders formatted number with tabular numerals', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    render(<CountUp value={1234} duration={50} />)
    expect(await screen.findByText('1,234', {}, { timeout: 2000 })).toBeInTheDocument()
  })
})
```

Note: jsdom lacks `requestAnimationFrame`; polyfill in `src/test/setup.ts` (real timers, no fake timers needed):

```ts
if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as unknown as number
  window.cancelAnimationFrame = (id: number) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>)
}
```

- [ ] **Step 2: Verify failure**

Run: `cd frontend && npx vitest run src/components/ui/CountUp.test.tsx`
Expected: FAIL — cannot resolve `./CountUp`.

- [ ] **Step 3: Create `frontend/src/components/ui/CountUp.tsx`:**

```tsx
import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '../../lib/motion'

interface Props {
  value: number
  duration?: number
  className?: string
}

function easeOutCubic(p: number): number {
  return 1 - Math.pow(1 - p, 3)
}

export function CountUp({ value, duration = 600, className }: Props) {
  const reduced = prefersReducedMotion()
  const [display, setDisplay] = useState(() => (reduced ? value : 0))

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      setDisplay(Math.round(value * easeOutCubic(p)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, reduced])

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {display.toLocaleString()}
    </span>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `cd frontend && npx vitest run src/components/ui/CountUp.test.tsx`
Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/CountUp.tsx frontend/src/components/ui/CountUp.test.tsx frontend/src/test/setup.ts
git commit -m "feat(frontend): CountUp component"
```

### Task 10: `Sparkline`

**Files:**
- Create: `frontend/src/components/ui/Sparkline.tsx`
- Test: `frontend/src/components/ui/Sparkline.test.tsx`

- [ ] **Step 1: Write failing test:**

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Sparkline } from './Sparkline'

describe('Sparkline', () => {
  it('renders an svg polyline with one point per datum plus end dot', () => {
    const { container } = render(<Sparkline points={[0, 3, 1, 7]} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg?.querySelectorAll('circle')).toHaveLength(1)
    const polyline = svg?.querySelector('polyline')
    expect(polyline?.getAttribute('points')?.trim().split(/\s+/)).toHaveLength(4)
  })

  it('is accessible via aria-label', () => {
    const { container } = render(<Sparkline points={[1, 2, 3]} label="7 clicks over 14 days" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-label', '7 clicks over 14 days')
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `cd frontend && npx vitest run src/components/ui/Sparkline.test.tsx`
Expected: FAIL — cannot resolve `./Sparkline`.

- [ ] **Step 3: Create `frontend/src/components/ui/Sparkline.tsx`:**

```tsx
interface Props {
  points: number[]
  width?: number
  height?: number
  label?: string
}

export function Sparkline({ points, width = 96, height = 28, label }: Props) {
  const max = Math.max(...points, 1)
  const stepX = points.length > 1 ? width / (points.length - 1) : width
  const coords = points.map((v, i) => {
    const x = (i * stepX).toFixed(1)
    const y = (height - 3 - (v / max) * (height - 6)).toFixed(1)
    return `${x},${y}`
  })
  const lastX = ((points.length - 1) * stepX).toFixed(1)
  const lastY = (height - 3 - (points[points.length - 1] / max) * (height - 6)).toFixed(1)

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label ?? 'click trend'}
      className="shrink-0"
    >
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke="var(--paper-teal)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill="var(--paper-teal)" />
    </svg>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `cd frontend && npx vitest run src/components/ui/Sparkline.test.tsx`
Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Sparkline.tsx frontend/src/components/ui/Sparkline.test.tsx
git commit -m "feat(frontend): Sparkline component"
```

### Task 11: `StatTile`, `Skeleton`, `EmptyState`

**Files:**
- Create: `frontend/src/components/ui/StatTile.tsx`
- Create: `frontend/src/components/ui/Skeleton.tsx`
- Create: `frontend/src/components/ui/EmptyState.tsx`

- [ ] **Step 1: Create `StatTile.tsx`:**

```tsx
import type { LucideIcon } from 'lucide-react'
import { CountUp } from './CountUp'

interface Props {
  icon: LucideIcon
  label: string
  value: number
  delta?: { value: string; positive: boolean } | null
  loading?: boolean
}

export function StatTile({ icon: Icon, label, value, delta = null, loading = false }: Props) {
  return (
    <div className="bg-surface border border-line rounded-[var(--radius-card)] px-4 py-3.5 hover-lift">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-ink-faint" aria-hidden />
        <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        {loading ? (
          <span className="inline-block h-6 w-20 rounded-md shimmer" aria-label={`loading ${label}`} />
        ) : (
          <>
            <CountUp value={value} className="font-display text-2xl font-bold text-ink" />
            {delta && (
              <span
                className={`font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                  delta.positive ? 'bg-green-soft text-green' : 'bg-danger-soft text-danger'
                }`}
              >
                {delta.positive ? '▲' : '▼'} {delta.value}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `Skeleton.tsx`:**

```tsx
interface Props {
  className?: string
  label?: string
}

export function Skeleton({ className = '', label }: Props) {
  return <div role="status" aria-label={label ?? 'loading'} className={`rounded-lg shimmer ${className}`} />
}
```

- [ ] **Step 3: Create `EmptyState.tsx`:**

```tsx
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-rise">
      <div className="w-14 h-14 rounded-2xl bg-surface-muted border border-line flex items-center justify-center mb-4 rotate-[-6deg]">
        <Icon className="w-6 h-6 text-ink-faint" aria-hidden />
      </div>
      <p className="font-display font-semibold text-ink">{title}</p>
      <p className="text-sm text-ink-muted mt-1 max-w-xs">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
```

- [ ] **Step 4: Typecheck + tests still green**

Run: `cd frontend && npx tsc --noEmit && npm test`
Expected: clean, all pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/
git commit -m "feat(frontend): StatTile, Skeleton, EmptyState primitives"
```

### Task 12: Toaster (sonner) + copy util

**Files:**
- Modify: `frontend/src/main.tsx`
- Create: `frontend/src/lib/clipboard.ts`
- Test: `frontend/src/lib/clipboard.test.ts`

- [ ] **Step 1: Write failing test `frontend/src/lib/clipboard.test.ts`:**

```ts
import { describe, it, expect, vi } from 'vitest'
import { copyWithToast } from './clipboard'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { toast } from 'sonner'

describe('copyWithToast', () => {
  it('writes to clipboard and fires success toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    await copyWithToast('shrt.ly/x', 'Link copied')
    expect(writeText).toHaveBeenCalledWith('shrt.ly/x')
    expect(toast.success).toHaveBeenCalledWith('Link copied')
  })

  it('fires error toast on failure', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    await copyWithToast('x', 'Link copied')
    expect(toast.error).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `cd frontend && npx vitest run src/lib/clipboard.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `frontend/src/lib/clipboard.ts`:**

```ts
import { toast } from 'sonner'

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export async function copyWithToast(text: string, message = 'Copied to clipboard'): Promise<void> {
  if (await copyToClipboard(text)) {
    toast.success(message)
  } else {
    toast.error('Could not access the clipboard')
  }
}
```

- [ ] **Step 4: Run test**

Run: `cd frontend && npx vitest run src/lib/clipboard.test.ts`
Expected: 2 PASS.

- [ ] **Step 5: Mount `<Toaster />` — edit `frontend/src/main.tsx`**

After imports add:

```ts
import { Toaster } from 'sonner'
```

Inside `<TanStackQueryProvider.Provider {...TanStackQueryProviderContext}>`, wrap:

```tsx
<>
  <Toaster
    position="top-right"
    duration={2500}
    toastOptions={{
      style: {
        background: '#1C1B18',
        color: '#FAFAF7',
        border: '1px solid #38352F',
        borderRadius: '10px',
        fontSize: '13px',
        fontFamily: 'Inter Variable, sans-serif',
      },
    }}
  />
  <RouterProvider router={router} />
</>
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/clipboard.ts frontend/src/lib/clipboard.test.ts frontend/src/main.tsx
git commit -m "feat(frontend): sonner toaster + clipboard util with toast feedback"
```

### Task 13: Confetti util

**Files:**
- Create: `frontend/src/components/ui/confetti.ts`
- Test: `frontend/src/components/ui/confetti.test.ts`

- [ ] **Step 1: Write failing test:**

```ts
import { describe, it, expect, vi } from 'vitest'

const confettiMock = vi.fn()
vi.mock('canvas-confetti', () => ({ default: confettiMock }))
import { celebrate } from './confetti'

describe('celebrate', () => {
  it('fires exactly once with palette colors', () => {
    confettiMock.mockReset()
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    celebrate()
    expect(confettiMock).toHaveBeenCalledTimes(1)
    const opts = confettiMock.mock.calls[0][0]
    expect(opts.particleCount).toBeLessThanOrEqual(16)
    expect(opts.colors).toContain('#4F46E5')
  })

  it('does nothing when reduced motion preferred', () => {
    confettiMock.mockReset()
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') }))
    celebrate()
    expect(confettiMock).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `cd frontend && npx vitest run src/components/ui/confetti.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `frontend/src/components/ui/confetti.ts`:**

```ts
import confetti from 'canvas-confetti'
import { prefersReducedMotion } from '../../lib/motion'

export function celebrate(originEl?: HTMLElement | null): void {
  if (prefersReducedMotion()) return

  let origin: { x: number; y: number } | undefined
  if (originEl) {
    const rect = originEl.getBoundingClientRect()
    origin = {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    }
  }

  confetti({
    particleCount: 14,
    spread: 70,
    startVelocity: 28,
    scalar: 0.9,
    ticks: 120,
    colors: ['#4F46E5', '#14B8A6', '#B45309', '#DC2626'],
    disableForReducedMotion: true,
    ...(origin ? { origin } : {}),
  })
}
```

- [ ] **Step 4: Run test**

Run: `cd frontend && npx vitest run src/components/ui/confetti.test.ts`
Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/confetti.ts frontend/src/components/ui/confetti.test.ts
git commit -m "feat(frontend): reduced-motion-aware confetti util"
```

### Task 14: `useTheme` store + ThemeToggle rework

**Files:**
- Create: `frontend/src/hooks/useTheme.ts`
- Test: `frontend/src/hooks/useTheme.test.ts`
- Modify: `frontend/src/components/Layout/ThemeToggle.tsx`

- [ ] **Step 1: Write failing test `frontend/src/hooks/useTheme.test.ts`:**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from './useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('dark'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  it('defaults to system and does not force dark class', () => {
    // stubbed matchMedia reports dark-preferred
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('system')
  })

  it("setTheme('light') removes the dark class and persists", () => {
    document.documentElement.classList.add('dark')
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('light'))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it("setTheme('dark') adds the dark class and persists", () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('dark'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `cd frontend && npx vitest run src/hooks/useTheme.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `frontend/src/hooks/useTheme.ts`:**

```ts
import { useCallback, useEffect, useState } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'

function apply(choice: ThemeChoice): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const effective = choice === 'system' ? (prefersDark ? 'dark' : 'light') : choice
  document.documentElement.classList.toggle('dark', effective === 'dark')
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeChoice>(() => {
    const stored = localStorage.getItem('theme')
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  })

  useEffect(() => {
    apply(theme)
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((choice: ThemeChoice) => {
    localStorage.setItem('theme', choice)
    setThemeState(choice)
  }, [])

  return { theme, setTheme }
}
```

- [ ] **Step 4: Run test**

Run: `cd frontend && npx vitest run src/hooks/useTheme.test.ts`
Expected: 3 PASS.

- [ ] **Step 5: Replace `ThemeToggle.tsx` (icon button cycles light → dark → system):**

```tsx
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme, type ThemeChoice } from '../../hooks/useTheme'

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
```

- [ ] **Step 6: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/hooks/useTheme.ts frontend/src/hooks/useTheme.test.ts frontend/src/components/Layout/ThemeToggle.tsx
git commit -m "feat(frontend): tri-state theme store (light/dark/system)"
```

### Task 15: `CommandPalette`

**Files:**
- Create: `frontend/src/components/ui/CommandPalette.tsx`
- Test: `frontend/src/components/ui/CommandPalette.test.tsx`

- [ ] **Step 1: Write failing test:**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CommandPalette } from './CommandPalette'

vi.mock('../../hooks/useLinks', () => ({
  useLinks: () => ({
    data: {
      data: [
        { id: 42, short_code: '9xKp', long_url: 'https://stripe.com/payments', short_url: 'http://r/9xKp' },
        { id: 43, short_code: 'aB3d', long_url: 'https://github.com/x', short_url: 'http://r/aB3d' },
      ],
    },
  }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const noop = () => {}

describe('CommandPalette', () => {
  it('renders nav commands when open', () => {
    render(<CommandPalette open onOpenChange={noop} />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Create new link')).toBeInTheDocument()
  })

  it('filters links by search term', () => {
    render(<CommandPalette open onOpenChange={noop} />)
    const input = screen.getByPlaceholderText(/type a command/i)
    fireEvent.change(input, { target: { value: 'stripe' } })
    expect(screen.getByText(/stripe\.com\/payments/)).toBeInTheDocument()
    expect(screen.queryByText(/github\.com\/x/)).not.toBeInTheDocument()
  })

  it('navigates on selecting a page command', () => {
    const onNavigate = vi.fn()
    render(<CommandPalette open onOpenChange={noop} onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText('Settings'))
    expect(onNavigate).toHaveBeenCalledWith('/settings')
  })

  it('copies a link url on select', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<CommandPalette open onOpenChange={noop} />)
    fireEvent.click(screen.getByText(/9xKp/))
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('http://r/9xKp'))
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `cd frontend && npx vitest run src/components/ui/CommandPalette.test.tsx`
Expected: FAIL — cannot resolve `./CommandPalette`.

- [ ] **Step 3: Create `frontend/src/components/ui/CommandPalette.tsx`:**

```tsx
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from '@tanstack/react-router'
import { LayoutDashboard, Link as LinkIcon, BarChart3, Settings, Plus, SunMoon, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { useLinks } from '../../hooks/useLinks'
import { copyToClipboard } from '../../lib/clipboard'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate?: (path: string) => void
}

const PAGES = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/links', label: 'Links', icon: LinkIcon },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export function CommandPalette({ open, onOpenChange, onNavigate }: Props) {
  const navigate = useNavigate()
  const go = onNavigate ?? ((path: string) => navigate({ to: path }))
  const { data } = useLinks()
  const links = data?.data ?? []

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const handleCreate = () => {
    go('/')
    onOpenChange(false)
    requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('shortly:focus-create')))
  }

  const handleCopyLink = async (url: string) => {
    if (await copyToClipboard(url)) toast.success('Link copied')
    else toast.error('Could not access the clipboard')
    onOpenChange(false)
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command menu"
      loop
      className="fixed left-1/2 top-[18%] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-overlay)] animate-rise"
      overlayClassName="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
      shouldFilter
    >
      <Command.Input
        placeholder="Type a command or search links…"
        className="w-full bg-transparent px-4 py-3.5 text-sm text-ink placeholder:text-ink-faint outline-none border-b border-line"
      />
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-ink-faint">
          No results found.
        </Command.Empty>

        <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-faint">
          <Item onSelect={handleCreate}>
            <Plus className="h-4 w-4" aria-hidden /> Create new link
            <Shortcut>C</Shortcut>
          </Item>
          <Item onSelect={() => { handleCopyLink(links[0]?.short_url ?? '') }} disabled={links.length === 0}>
            <Copy className="h-4 w-4" aria-hidden /> Copy most recent link
          </Item>
          <Item onSelect={() => { document.documentElement.classList.toggle('dark'); onOpenChange(false) }}>
            <SunMoon className="h-4 w-4" aria-hidden /> Toggle theme
            <Shortcut>T</Shortcut>
          </Item>
        </Command.Group>

        <Command.Group heading="Pages" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-faint">
          {PAGES.map((p) => (
            <Item key={p.path} onSelect={() => { go(p.path); onOpenChange(false) }}>
              <p.icon className="h-4 w-4" aria-hidden /> {p.label}
            </Item>
          ))}
        </Command.Group>

        {links.length > 0 && (
          <Command.Group heading="Your links" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-faint">
            {links.slice(0, 8).map((l) => (
              <Item key={l.id} value={`${l.short_code} ${l.long_url}`} onSelect={() => handleCopyLink(l.short_url)}>
                <span className="font-mono text-xs font-medium text-accent">{l.short_code}</span>
                <span className="truncate text-xs text-ink-muted">{l.long_url}</span>
              </Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  )
}

function Item({ children, onSelect, disabled, value }: {
  children: ReactNode
  onSelect: () => void
  disabled?: boolean
  value?: string
}) {
  return (
    <Command.Item
      value={value}
      disabled={disabled}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent data-[disabled=true]:opacity-40"
    >
      {children}
    </Command.Item>
  )
}

function Shortcut({ children }: { children: ReactNode }) {
  return (
    <kbd className="ml-auto font-mono text-[10px] text-ink-faint border border-line rounded px-1 py-0.5">
      {children}
    </kbd>
  )
}
```

Note: cmdk's `Command.Dialog` accepts `overlayClassName` since v0.2.x; if types complain, wrap in your own fixed-position container instead using `Command` (non-dialog) inside a conditional `{open && …}` div — behavior identical.

The "C"/"T" shortcut kbd hints are visual only; single-key handling is intentionally not wired (YAGNI).

- [ ] **Step 4: Run tests**

Run: `cd frontend && npx vitest run src/components/ui/CommandPalette.test.tsx`
Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/CommandPalette.tsx frontend/src/components/ui/CommandPalette.test.tsx
git commit -m "feat(frontend): ⌘K command palette (nav, create, theme, copy links)"
```

### Task 16: `QRPopover`

**Files:**
- Create: `frontend/src/components/ui/QRPopover.tsx`
- Test: `frontend/src/components/ui/QRPopover.test.tsx`

- [ ] **Step 1: Write failing test:**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QRPopover } from './QRPopover'

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <div data-testid="qr">{value}</div>,
}))

describe('QRPopover', () => {
  it('shows qr code after opening, closes on second click', () => {
    render(<QRPopover value="http://localhost:8000/9xKp" caption="shrt.ly/9xKp" />)
    expect(screen.queryByTestId('qr')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /show qr code/i }))
    expect(screen.getByTestId('qr')).toHaveTextContent('http://localhost:8000/9xKp')

    fireEvent.click(screen.getByRole('button', { name: /hide qr code/i }))
    expect(screen.queryByTestId('qr')).not.toBeInTheDocument()
  })

  it('exposes expanded state to assistive tech', () => {
    render(<QRPopover value="v" caption="c" />)
    const btn = screen.getByRole('button', { name: /show qr code/i })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `cd frontend && npx vitest run src/components/ui/QRPopover.test.tsx`
Expected: FAIL — cannot resolve `./QRPopover`.

- [ ] **Step 3: Create `frontend/src/components/ui/QRPopover.tsx`:**

```tsx
import { useState } from 'react'
import { QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface Props {
  value: string
  caption: string
}

export function QRPopover({ value, caption }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? 'Hide QR code' : 'Show QR code'}
        title={open ? 'Hide QR code' : 'Show QR code'}
        className="p-2 rounded-lg border border-line hover:bg-surface-muted transition-colors"
      >
        <QrCode className="w-3.5 h-3.5 text-ink-muted" aria-hidden />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={`QR code for ${caption}`}
          className="absolute right-0 top-full mt-2 z-30 w-max rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-overlay)] animate-rise"
        >
          <QRCodeSVG value={value} size={128} bgColor="#FFFFFF" fgColor="#37352F" level="M" />
          <p className="mt-2 text-center font-mono text-[11px] text-ink-muted">{caption}</p>
          <p className="text-center text-[10px] text-ink-faint">Scan to open</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test**

Run: `cd frontend && npx vitest run src/components/ui/QRPopover.test.tsx`
Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/QRPopover.tsx frontend/src/components/ui/QRPopover.test.tsx
git commit -m "feat(frontend): QR popover component"
```

---

## Phase D — Layout & pages

### Task 17: `linkStatus` lib + `LinkCardList`

**Files:**
- Create: `frontend/src/lib/linkStatus.ts`
- Test: `frontend/src/lib/linkStatus.test.ts`
- Create: `frontend/src/components/Dashboard/LinkCardList.tsx`

- [ ] **Step 1: Write failing test `frontend/src/lib/linkStatus.test.ts`:**

```ts
import { describe, it, expect } from 'vitest'
import { getLinkStatus } from './linkStatus'
import type { Link } from '../types'

const base = {
  id: 1,
  short_code: '9xKp',
  long_url: 'https://example.com',
  user_id: 'u',
  created_at: '',
  updated_at: '',
  short_url: '',
} satisfies Link

describe('getLinkStatus', () => {
  it('flags active links', () => {
    expect(getLinkStatus(base)).toEqual({ label: 'Active', tone: 'green' })
  })

  it('flags expired when expires_at is past', () => {
    const link = { ...base, expires_at: new Date(Date.now() - 1000).toISOString() }
    expect(getLinkStatus(link)).toEqual({ label: 'Expired', tone: 'amber' })
  })

  it('flags protected by password presence', () => {
    expect(getLinkStatus({ ...base, password: 'hashed' })).toEqual({ label: 'Protected', tone: 'purple' })
  })

  it('flags deleted before anything else', () => {
    const link = { ...base, password: 'h', deleted_at: new Date().toISOString() }
    expect(getLinkStatus(link)).toEqual({ label: 'Deleted', tone: 'red' })
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `cd frontend && npx vitest run src/lib/linkStatus.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `frontend/src/lib/linkStatus.ts`:**

```ts
import type { Link } from '../types'

export type StatusTone = 'green' | 'amber' | 'purple' | 'red'

export function getLinkStatus(link: Link): { label: string; tone: StatusTone } {
  if (link.deleted_at) return { label: 'Deleted', tone: 'red' }
  if (link.expires_at && new Date(link.expires_at) < new Date()) return { label: 'Expired', tone: 'amber' }
  if (link.password) return { label: 'Protected', tone: 'purple' }
  return { label: 'Active', tone: 'green' }
}

export const TONE_CLASSES: Record<StatusTone, string> = {
  green: 'bg-green-soft text-green',
  amber: 'bg-amber-soft text-amber-warm',
  purple: 'bg-protected-soft text-protected',
  red: 'bg-danger-soft text-danger',
}
```

- [ ] **Step 4: Run test → green**

Run: `cd frontend && npx vitest run src/lib/linkStatus.test.ts`
Expected: 4 PASS.

- [ ] **Step 5: Create `frontend/src/components/Dashboard/LinkCardList.tsx`:**

```tsx
import { useState, type CSSProperties, type ReactNode } from 'react'
import { Copy, BarChart3, Pencil, Trash2, ChevronLeft, ChevronRight, QrCode } from 'lucide-react'
import type { Link, OverviewLinkStat } from '../../types'
import { getLinkStatus, TONE_CLASSES } from '../../lib/linkStatus'
import { copyWithToast } from '../../lib/clipboard'
import { Sparkline } from '../ui/Sparkline'
import { QRPopover } from '../ui/QRPopover'
import { EmptyState } from '../ui/EmptyState'

interface Props {
  links: Link[]
  statsByLinkId?: Map<number, OverviewLinkStat>
  hasNext: boolean
  hasPrevious: boolean
  onNext: () => void
  onPrevious: () => void
  onEdit: (link: Link) => void
  onDelete: (link: Link) => void
  onAnalytics: (link: Link) => void
  emptyAction?: ReactNode
}

export function LinkCardList({
  links, statsByLinkId, hasNext, hasPrevious, onNext, onPrevious, onEdit, onDelete, onAnalytics, emptyAction,
}: Props) {
  const [copiedId, setCopiedId] = useState<number | null>(null)

  if (links.length === 0) {
    return (
      <EmptyState
        icon={QrCode}
        title="No links yet"
        description="Paste a URL above to create your first short link — it takes under a second."
        action={emptyAction}
      />
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-2.5">
        {links.map((link, i) => {
          const status = getLinkStatus(link)
          const stat = statsByLinkId?.get(link.id)
          return (
            <div
              key={link.id}
              style={{ '--stagger-i': Math.min(i, 8) } as CSSProperties}
              className="animate-rise bg-surface border border-line rounded-[var(--radius-card)] px-4 py-3 hover-lift hover:border-line-strong"
            >
              <div className="flex items-center gap-3 min-w-0">
                <a
                  href={link.short_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-sm font-medium text-accent hover:text-accent-strong shrink-0"
                >
                  /{link.short_code}
                </a>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${TONE_CLASSES[status.tone]}`}>
                  {status.label}
                </span>

                <p className="text-xs text-ink-muted truncate flex-1">{link.long_url}</p>

                {stat && (
                  <Sparkline
                    points={stat.clicks_14d}
                    label={`${stat.clicks_total} clicks over the last 14 days`}
                  />
                )}

                {stat ? (
                  <span className="font-mono text-xs text-ink-muted w-14 text-right shrink-0" title="total clicks">
                    {stat.clicks_total.toLocaleString()}
                  </span>
                ) : null}

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { copyWithToast(`${link.short_url}`); setCopiedId(link.id); setTimeout(() => setCopiedId(null), 1500) }}
                    className="p-2 rounded-lg hover:bg-surface-muted transition-colors relative"
                    aria-label={`Copy short URL ${link.short_code}`}
                  >
                    {copiedId === link.id ? <span className="text-[10px] text-green">✓</span> : <Copy className="w-3.5 h-3.5 text-ink-muted" />}
                  </button>
                  <QRPopover value={link.short_url} caption={`/${link.short_code}`} />
                  <button onClick={() => onEdit(link)} aria-label={`Edit ${link.short_code}`}
                    className="p-2 rounded-lg hover:bg-surface-muted transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-ink-muted" />
                  </button>
                  <button onClick={() => onAnalytics(link)} aria-label={`Analytics for ${link.short_code}`}
                    className="p-2 rounded-lg hover:bg-surface-muted transition-colors">
                    <BarChart3 className="w-3.5 h-3.5 text-ink-muted" />
                  </button>
                  <button onClick={() => onDelete(link)} aria-label={`Delete ${link.short_code}`}
                    className="p-2 rounded-lg hover:bg-danger-soft transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-danger" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <nav className="flex items-center justify-between mt-4" aria-label="Pagination">
        <div className="text-xs text-ink-faint font-mono">
          {links.length} link{links.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onPrevious} disabled={!hasPrevious} aria-label="Previous page"
            className="p-2 rounded-lg border border-line hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft className="w-4 h-4 text-ink-muted" />
          </button>
          <button onClick={onNext} disabled={!hasNext} aria-label="Next page"
            className="p-2 rounded-lg border border-line hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronRight className="w-4 h-4 text-ink-muted" />
          </button>
        </div>
      </nav>
    </div>
  )
}
```

Note: `copyWithToast` already shows the toast — the inline ✓ is an extra affordance on the button itself.

- [ ] **Step 6: Typecheck + tests**

Run: `cd frontend && npx tsc --noEmit && npm test`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/linkStatus.ts frontend/src/lib/linkStatus.test.ts frontend/src/components/Dashboard/LinkCardList.tsx
git commit -m "feat(frontend): LinkCardList with sparklines, QR, status tones"
```

### Task 18: Sidebar + AdminLayout reskin

**Files:**
- Modify: `frontend/src/components/Layout/Sidebar.tsx`
- Modify: `frontend/src/components/Layout/AdminLayout.tsx`
- Modify: `frontend/src/components/Layout/AuthGuard.tsx`

- [ ] **Step 1: Replace `Sidebar.tsx` body:**

```tsx
import { Link, useLocation } from '@tanstack/react-router'
import { LayoutDashboard, Link as LinkIcon, BarChart3, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useState } from 'react'
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
          const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
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
                {user?.name?.charAt(0) || '?'}
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
```

- [ ] **Step 2: Replace `AdminLayout.tsx`:**

```tsx
import { Outlet, useLocation } from '@tanstack/react-router'
import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { CommandPalette } from '../ui/CommandPalette'

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
```

(⌘K hotkey lives inside `CommandPalette`, so mounting it here activates it app-wide.)

- [ ] **Step 3: AuthGuard loading shell — replace spinner block in `AuthGuard.tsx`:**

```tsx
  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-canvas">
        <div className="w-8 h-8 rounded-full border-2 border-line border-t-accent animate-spin" aria-label="Loading" role="status" />
      </div>
    )
  }
```

- [ ] **Step 4: Typecheck + visual check**

Run: `cd frontend && npx tsc --noEmit && npm run dev`
Expected: sidebar is warm-paper with pill nav; breadcrumb renders; ⌘K opens palette. Old pages still readable (slate classes remain until later tasks).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Layout/
git commit -m "feat(frontend): Warm Paper sidebar/layout, global ⌘K palette mount"
```

### Task 19: QuickCreateBar restyle + confetti/toast + focus event

**Files:**
- Modify: `frontend/src/components/Dashboard/QuickCreateBar.tsx`

- [ ] **Step 1: Replace file content:**

```tsx
import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useCreateLink } from '../../hooks/useLinks'
import { toast } from 'sonner'
import { celebrate } from '../ui/confetti'

interface Props {
  onOpenPanel: () => void
}

export function QuickCreateBar({ onOpenPanel }: Props) {
  const [url, setUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const createLink = useCreateLink()

  // ⌘K "Create new link" command focuses this input
  useEffect(() => {
    const onFocusCreate = () => inputRef.current?.focus()
    window.addEventListener('shortly:focus-create', onFocusCreate)
    return () => window.removeEventListener('shortly:focus-create', onFocusCreate)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    try {
      const result = await createLink.mutateAsync({ long_url: url.trim() })
      celebrate(inputRef.current)
      toast.success(`Short link created: /${result.data.data.short_code}`)
      setUrl('')
    } catch {
      toast.error('Could not shorten that URL')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-6" aria-label="Quick create link">
      <input
        ref={inputRef}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://paste-a-long-url.com…"
        className="flex-1 px-4 py-2.5 rounded-[var(--radius-control)] border border-line-strong bg-surface text-ink text-sm placeholder:text-ink-faint outline-none focus:border-accent transition-colors"
      />
      <button
        type="submit"
        disabled={!url.trim() || createLink.isPending}
        className="px-5 py-2.5 rounded-[var(--radius-control)] bg-ink text-white dark:text-[#1C1B18] dark:bg-[#EDEAE4] text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Shorten
      </button>
      <button
        type="button"
        onClick={onOpenPanel}
        aria-label="More options (password, expiry)"
        title="Password, expiry…"
        className="px-3 rounded-[var(--radius-control)] border border-dashed border-line-strong hover:border-accent hover:text-accent text-ink-faint transition-colors"
      >
        <Plus className="w-4.5 h-4.5" aria-hidden />
      </button>
    </form>
  )
}
```

Check `useCreateLink().mutateAsync` return shape first: `linksApi.create` returns `ApiResponse<Link>` so `result.data.data.short_code` is correct only if mutation returns response directly (it does — `mutationFn: linksApi.create`). If TS disagrees at typecheck, adjust to `result.data.short_code`.

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean (adjust per note above if needed).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Dashboard/QuickCreateBar.tsx
git commit -m "feat(frontend): quick-create bar with confetti + toasts"
```

### Task 20: Dashboard page assembly

**Files:**
- Modify: `frontend/src/routes/index.tsx` (replace content)

- [ ] **Step 1: Replace `routes/index.tsx` with:**

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Link as LinkIcon, MousePointerClick, CheckCircle } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { CreateLinkPanel } from '../components/Dashboard/CreateLinkPanel'
import { DeleteConfirmDialog } from '../components/Dashboard/DeleteConfirmDialog'
import { LinkCardList } from '../components/Dashboard/LinkCardList'
import { QuickCreateBar } from '../components/Dashboard/QuickCreateBar'
import { StatTile } from '../components/ui/StatTile'
import { Skeleton } from '../components/ui/Skeleton'
import { useDeleteLink, useLinks } from '../hooks/useLinks'
import { useOverview } from '../hooks/useOverview'
import { useAuth } from '../hooks/useAuth'
import type { Link } from '../types'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function sumByDay(perLink: Array<{ clicks_14d: number[] }>): number[] {
  const totals = Array<number>(14).fill(0)
  for (const l of perLink) l.clicks_14d.forEach((c, i) => (totals[i] += c))
  return totals
}

function DashboardPage() {
  const [cursor, setCursor] = useState<number | undefined>(undefined)
  const [cursors, setCursors] = useState<Array<number>>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<Link | null>(null)
  const [deletingLink, setDeletingLink] = useState<Link | null>(null)
  const { data } = useLinks(cursor)
  const overview = useOverview()
  const deleteLink = useDeleteLink()
  const navigate = useNavigate()
  const { user } = useAuth()

  const links = data?.data ?? []
  const hasNext = data?.has_next ?? false

  const statsByLinkId = useMemo(() => {
    const m = new Map<number, import('../types').OverviewLinkStat>()
    for (const s of overview.data?.data.per_link ?? []) m.set(s.link_id, s)
    return m
  }, [overview.data])

  const totals = overview.data?.data.totals
  const weeklyDelta = useMemo(() => {
    const series = sumByDay(overview.data?.data.per_link ?? [])
    const last7 = series.slice(7).reduce((a, b) => a + b, 0)
    const prev7 = series.slice(0, 7).reduce((a, b) => a + b, 0)
    if (prev7 === 0) return last7 > 0 ? { value: 'new', positive: true } : null
    const pct = Math.round(((last7 - prev7) / prev7) * 100)
    return pct === 0 ? null : { value: `${Math.abs(pct)}%`, positive: pct > 0 }
  }, [overview.data])

  const chartData = useMemo(
    () => sumByDay(overview.data?.data.per_link ?? []).map((clicks, i) => ({ day: i, clicks })),
    [overview.data],
  )

  const handleNext = () => {
    if (data?.next_cursor) {
      setCursors((prev) => [...prev, cursor ?? 0])
      setCursor(data.next_cursor)
    }
  }
  const handlePrevious = () => {
    setCursors((prev) => {
      const next = [...prev]
      setCursor(next.pop())
      return next
    })
  }
  const handleDelete = async () => {
    if (!deletingLink) return
    await deleteLink.mutateAsync(deletingLink.id)
    setDeletingLink(null)
  }

  return (
    <div>
      <header className="flex items-baseline justify-between mb-6">
        <h1 className="font-display text-xl font-bold tracking-tight text-ink">
          {greeting()}, {(user?.name ?? '').split(' ')[0] || 'there'}
        </h1>
        <p className="hidden sm:block text-xs text-ink-faint">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          {' · '}
          <kbd className="font-mono border border-line rounded px-1 py-0.5">⌘K</kbd> for commands
        </p>
      </header>

      <QuickCreateBar onOpenPanel={() => { setEditingLink(null); setPanelOpen(true) }} />

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5" aria-label="Stats">
        <StatTile icon={LinkIcon} label="Total links" value={totals?.total_links ?? 0} loading={overview.isPending} />
        <StatTile icon={MousePointerClick} label="Total clicks" value={totals?.total_clicks ?? 0} delta={weeklyDelta} loading={overview.isPending} />
        <StatTile icon={CheckCircle} label="Active" value={totals?.active_links ?? 0} loading={overview.isPending} />
      </section>

      <section className="bg-surface border border-line rounded-[var(--radius-card)] px-4 py-3 mb-5" aria-label="Clicks over last 14 days">
        <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted mb-2">Clicks · last 14 days</p>
        <div className="h-28">
          {overview.isPending ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="dashFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--paper-accent)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="var(--paper-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="clicks" stroke="var(--paper-accent)" strokeWidth={2} fill="url(#dashFill)" isAnimationActive={!window.matchMedia('(prefers-reduced-motion: reduce)').matches} animationDuration={600} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <LinkCardList
        links={links}
        statsByLinkId={statsByLinkId}
        hasNext={hasNext}
        hasPrevious={cursors.length > 0}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onEdit={(link) => { setEditingLink(link); setPanelOpen(true) }}
        onDelete={(link) => setDeletingLink(link)}
        onAnalytics={(link) => navigate({ to: `/links/${link.id}/analytics` })}
      />

      <CreateLinkPanel isOpen={panelOpen} onClose={() => { setPanelOpen(false); setEditingLink(null) }} editLink={editingLink} />
      <DeleteConfirmDialog link={deletingLink} onConfirm={handleDelete} onCancel={() => setDeletingLink(null)} isPending={deleteLink.isPending} />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + tests + build**

Run: `cd frontend && npx tsc --noEmit && npm test && npm run build`
Expected: all green.

- [ ] **Step 3: Visual check**

Run dev server; verify: greeting, tiles count up, area chart draws, cards stagger in, sparklines appear (needs backend running + some links/click data), ⌘K works.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/index.tsx
git commit -m "feat(frontend): dashboard assembly with live overview stats + chart"
```

### Task 21: Focus trap util + dialogs reskin

**Files:**
- Create: `frontend/src/lib/focusTrap.ts`
- Test: `frontend/src/lib/focusTrap.test.ts`
- Modify: `frontend/src/components/Dashboard/CreateLinkPanel.tsx`
- Modify: `frontend/src/components/Dashboard/DeleteConfirmDialog.tsx`

- [ ] **Step 1: Write failing test `frontend/src/lib/focusTrap.test.ts`:**

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { useRef } from 'react'
import { useFocusTrap } from './focusTrap'

function Harness({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, active)
  return (
    <div>
      <button>outside</button>
      <div ref={ref}>
        <button>first</button>
        <button>last</button>
      </div>
    </div>
  )
}

describe('useFocusTrap', () => {
  it('focuses first element when activated and restores focus on deactivate', () => {
    const { rerender } = render(<Harness active={false} />)
    ;(document.activeElement as HTMLElement).blur?.()
    rerender(<Harness active />)
    expect(document.activeElement).toHaveTextContent('first')
  })

  it('wraps Tab from last back to first', () => {
    const { getByText } = render(<Harness active />)
    const last = getByText('last')
    last.focus()
    const evt = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    document.dispatchEvent(evt)
    expect(document.activeElement).toHaveTextContent('first')
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `cd frontend && npx vitest run src/lib/focusTrap.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `frontend/src/lib/focusTrap.ts`:**

```ts
import { useEffect, type RefObject } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active || !ref.current) return
    const container = ref.current
    const previouslyFocused = document.activeElement as HTMLElement | null

    const first = container.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        ;(document.activeElement as HTMLElement)?.blur()
        return
      }
      if (e.key !== 'Tab') return
      const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusables.length === 0) return
      const firstEl = focusables[0]
      const lastEl = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [active, ref])
}
```

Note: Escape handling intentionally does NOT close panels here (owner components already do); it only releases focus. Keep behavior minimal.

- [ ] **Step 4: Run test → green**

Run: `cd frontend && npx vitest run src/lib/focusTrap.test.ts`
Expected: 2 PASS.

- [ ] **Step 5: Reskin `CreateLinkPanel.tsx`**

Apply these changes to the existing file:

1. Add imports:

```ts
import { X } from 'lucide-react' // already imported
import { useFocusTrap } from '../../lib/focusTrap'
import { toast } from 'sonner'
import { useRef } from 'react'
```

2. Inside the component add:

```ts
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, isOpen)
```

3. On success paths add toasts — after `await updateLink.mutateAsync(...)` add `toast.success('Link updated')`; after create success add `toast.success('Short link created')`. In the `catch` block add `toast.error('Something went wrong')` (keep existing comment removed).

4. Swap classNames (overlay unchanged except color):

```tsx
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} aria-hidden />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={editLink ? 'Edit link' : 'Create link'}
           className="fixed right-0 top-0 h-full w-full max-w-md bg-surface border-l border-line shadow-[var(--shadow-overlay)] z-50 flex flex-col animate-rise">
```

Header row: `<h2 className="font-display text-base font-semibold text-ink">`, close button `className="p-1.5 rounded-lg hover:bg-surface-muted text-ink-muted"`.

Labels: `className="block text-[13px] font-medium text-ink mb-1"`.
Inputs: `className="w-full px-3 py-2 rounded-[var(--radius-control)] border border-line-strong bg-surface text-ink text-sm placeholder:text-ink-faint outline-none focus:border-accent transition-colors"`.

Submit button: `className="w-full py-2.5 rounded-[var(--radius-control)] bg-ink text-white dark:text-[#1C1B18] dark:bg-[#EDEAE4] text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40"`.

Error paragraph: `className="text-sm text-danger"`.

- [ ] **Step 6: Reskin `DeleteConfirmDialog.tsx`**

Add trap + tokens:

```tsx
import { useRef } from 'react'
import { useFocusTrap } from '../../lib/focusTrap'

// inside component:
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, !!link)
```

Overlay: `bg-black/30`. Card: `bg-surface rounded-xl border border-line shadow-[var(--shadow-overlay)] max-w-sm w-full p-6 animate-rise`.
Title: `font-display text-base font-semibold text-ink mb-2`.
Body text: `text-sm text-ink-muted mb-6`; short code span: `font-mono text-accent`.
Cancel: `px-4 py-2 rounded-[var(--radius-control)] border border-line-strong hover:bg-surface-muted text-sm font-medium text-ink transition-colors disabled:opacity-40`.
Delete: `px-4 py-2 rounded-[var(--radius-control)] bg-danger hover:opacity-90 text-white text-sm font-semibold transition-all disabled:opacity-40`.

Also add `role="dialog" aria-modal="true" aria-label={`Delete ${link.short_code}`}` and `ref={dialogRef}` to the card div.

- [ ] **Step 7: Typecheck + tests + visual check**

Run: `cd frontend && npx tsc --noEmit && npm test && npm run dev`
Expected: clean; open panel → focus lands on first input; Tab wraps; ESC closes.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/lib/focusTrap.ts frontend/src/lib/focusTrap.test.ts frontend/src/components/Dashboard/CreateLinkPanel.tsx frontend/src/components/Dashboard/DeleteConfirmDialog.tsx
git commit -m "feat(frontend): focus-trapped reskinned dialogs"
```

### Task 22: Login redesign

**Files:**
- Modify: `frontend/src/routes/login.tsx` (replace content)

- [ ] **Step 1: Replace file with:**

```tsx
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
    if (!isPending && isAuthenticated) navigate({ to: '/' })
  }, [isAuthenticated, isPending, navigate])

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-canvas">
        <div className="w-8 h-8 rounded-full border-2 border-line border-t-accent animate-spin" role="status" aria-label="Loading" />
      </div>
    )
  }

  if (isAuthenticated) return null

  return (
    <div className="flex items-center justify-center min-h-screen bg-canvas px-4
                    bg-[linear-gradient(var(--paper-line)_1px,transparent_1px),linear-gradient(90deg,var(--paper-line)_1px,transparent_1px)]
                    bg-[size:32px_32px]">
      <div className="animate-rise bg-surface border border-line rounded-2xl shadow-[var(--shadow-overlay)] p-8 max-w-sm w-full text-center">
        <div className="inline-grid place-items-center w-11 h-11 rounded-xl bg-ink text-canvas font-display font-bold text-lg mb-4">s</div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          shortly<span className="text-accent">*</span>
        </h1>
        <p className="text-sm text-ink-muted mt-1 mb-7">Shorten anything. Track everything.</p>

        <button
          onClick={async () => { setLoading(true); try { await signIn() } finally { setLoading(false) } }}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-[var(--radius-control)] bg-ink text-white dark:text-[#1C1B18] dark:bg-[#EDEAE4]
                     text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition-all
                     disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white dark:border-black/20 dark:border-t-black/60 animate-spin" aria-label="Signing in" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          )}
          Continue with Google
        </button>

        <p className="mt-6 text-[11px] text-ink-faint">Self-hosted · your links never leave your server</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + build**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: green.

- [ ] **Step 3: Visual check** (logged out): grid-paper texture visible, card rises in.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/login.tsx
git commit -m "feat(frontend): Warm Paper login page"
```

### Task 23: Links page — search + filter pills

**Files:**
- Modify: `frontend/src/routes/links.tsx` (replace list wiring section)

- [ ] **Step 1: Write failing test `frontend/src/lib/filterLinks.test.ts`:**

```ts
import { describe, it, expect } from 'vitest'
import { filterLinks } from './filterLinks'
import type { Link } from '../../types'

const mk = (over: Partial<Link>): Link => ({
  id: 1, short_code: 'x', long_url: 'https://e.com', user_id: 'u',
  created_at: '', updated_at: '', short_url: '', ...over,
})

describe('filterLinks', () => {
  const links = [
    mk({ id: 1, short_code: '9xKp', long_url: 'https://stripe.com/payments' }),
    mk({ id: 2, short_code: 'aB3d', long_url: 'https://github.com/x', password: 'h' }),
    mk({ id: 3, short_code: 'zZ9y', long_url: 'https://expired.io', expires_at: new Date(Date.now() - 1000).toISOString() }),
  ]

  it('filters by query across code and target', () => {
    expect(filterLinks(links, 'stripe', 'all').map((l) => l.id)).toEqual([1])
    expect(filterLinks(links, 'ab3d', 'all').map((l) => l.id)).toEqual([2])
  })

  it('filters by status', () => {
    expect(filterLinks(links, '', 'protected').map((l) => l.id)).toEqual([2])
    expect(filterLinks(links, '', 'expired').map((l) => l.id)).toEqual([3])
    expect(filterLinks(links, '', 'active').map((l) => l.id)).toEqual([1])
  })

  it('combines both', () => {
    expect(filterLinks(links, 'github', 'protected').map((l) => l.id)).toEqual([2])
    expect(filterLinks(links, 'github', 'active')).toEqual([])
  })
})
```


- [ ] **Step 2: Verify failure**

Run: `cd frontend && npx vitest run src/components/Dashboard/filterLinks.test.ts`
Expected: FAIL.

- [ ] **Step 3: Create `frontend/src/components/Dashboard/filterLinks.ts`:**

```ts
import type { Link } from '../../types'
import { getLinkStatus } from '../../lib/linkStatus'

export type StatusFilter = 'all' | 'active' | 'expired' | 'protected'

export function filterLinks(links: Link[], query: string, status: StatusFilter): Link[] {
  const q = query.trim().toLowerCase()
  return links.filter((link) => {
    if (q && !`${link.short_code} ${link.long_url}`.toLowerCase().includes(q)) return false
    if (status !== 'all' && getLinkStatus(link).label.toLowerCase() !== status) return false
    return true
  })
}
```

Fix test import path (`./linkStatus` line is unnecessary — delete it).

- [ ] **Step 4: Run test → green**

Run: `cd frontend && npx vitest run src/components/Dashboard/filterLinks.test.ts`
Expected: 3 PASS.

- [ ] **Step 5: Update `routes/links.tsx`**

Changes:
1. Imports — replace `LinkListTable` with `LinkCardList`, add `filterLinks`:

```ts
import { LinkCardList } from '../components/Dashboard/LinkCardList'
import { filterLinks, type StatusFilter } from '../components/Dashboard/filterLinks'
import { Search } from 'lucide-react'
import { useMemo } from 'react'
```

2. Inside component add state + memo:

```ts
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const filtered = useMemo(() => filterLinks(links, query, status), [links, query, status])
```

3. Replace `<h1>` block and `<QuickCreateBar/>` region header area with toolbar:

```tsx
      <header className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="font-display text-xl font-bold tracking-tight text-ink mr-auto">Links</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search links…"
            aria-label="Search links"
            className="w-56 pl-8 pr-3 py-2 rounded-full border border-line-strong bg-surface text-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent transition-colors"
          />
        </div>
        <div role="group" aria-label="Filter by status" className="flex gap-1">
          {(['all', 'active', 'expired', 'protected'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                status === s ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-surface-muted'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>
```

4. Swap `<LinkListTable …>` for `<LinkCardList links={filtered} …same other props… />` (add `emptyAction={<button onClick={() => setPanelOpen(true)} className="px-4 py-2 rounded-[var(--radius-control)] bg-ink text-white dark:text-[#1C1B18] dark:bg-[#EDEAE4] text-sm font-semibold">Create a link</button>}`).

- [ ] **Step 6: Typecheck + tests**

Run: `cd frontend && npx tsc --noEmit && npm test`
Expected: green.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/Dashboard/filterLinks.ts frontend/src/components/Dashboard/filterLinks.test.ts frontend/src/routes/links.tsx
git commit -m "feat(frontend): links page search + status filters"
```

### Task 24: `StatBars` + analytics page restyle

**Files:**
- Create: `frontend/src/components/ui/StatBars.tsx`
- Test: `frontend/src/components/ui/StatBars.test.tsx`
- Modify: `frontend/src/routes/links_.$id.analytics.tsx` (replace content)
- Modify: `frontend/src/components/Analytics/TimelineChart.tsx` (restyle)

- [ ] **Step 1: Write failing test:**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatBars } from './StatBars'

describe('StatBars', () => {
  it('renders label, value and percent width', () => {
    const { container } = render(
      <StatBars title="Top referrers" rows={[{ key: 'google.com', value: 60, percentage: 60 }, { key: 'Direct', value: 40, percentage: 40 }]} />,
    )
    expect(screen.getByText('google.com')).toBeInTheDocument()
    expect(screen.getByText('Direct')).toBeInTheDocument()
    const fills = container.querySelectorAll('[data-testid="bar-fill"]')
    expect(fills[0]).toHaveStyle({ width: '60%' })
  })

  it('shows empty message', () => {
    render(<StatBars title="Locations" rows={[]} emptyMessage="No data yet" />)
    expect(screen.getByText('No data yet')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `cd frontend && npx vitest run src/components/ui/StatBars.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Create `StatBars.tsx`:**

```tsx
interface Row {
  key: string
  value: number | string
  percentage?: number
}

interface Props {
  title: string
  rows: Row[]
  emptyMessage?: string
}

export function StatBars({ title, rows, emptyMessage = 'No data yet' }: Props) {
  const maxPct = Math.max(...rows.map((r) => r.percentage ?? 0), 1)
  return (
    <section aria-label={title}>
      <h3 className="text-[13px] font-semibold text-ink mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-ink-faint py-4">{emptyMessage}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.slice(0, 8).map((row) => (
            <li key={row.key} className="group">
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="text-xs text-ink truncate">{row.key}</span>
                <span className="font-mono text-[11px] text-ink-muted shrink-0">
                  {typeof row.value === 'number' ? row.value.toLocaleString() : row.value}
                  {row.percentage !== undefined ? ` · ${row.percentage}%` : ''}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                <div
                  data-testid="bar-fill"
                  className="h-full rounded-full bg-accent group-hover:bg-accent-strong transition-colors"
                  style={{ width: `${Math.round(((row.percentage ?? 100) / maxPct) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Run test → green**

Run: `cd frontend && npx vitest run src/components/ui/StatBars.test.tsx`
Expected: 2 PASS.

- [ ] **Step 5: Restyle `TimelineChart.tsx` internals**

Change the component's props to `{ data?: TimelinePoint[] | null }` only — remove its `isPending` prop and any internal loading UI, since pages now own loading states (Task 20/24 render `<Skeleton/>` instead). Then update chart colors/motion to match tokens:
- Line/stroke → `stroke="var(--paper-accent)" strokeWidth={2}`
- Gradient stops → `var(--paper-accent)` opacity 0.22 → 0
- Axis tick styling → `{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: 'var(--paper-ink-faint)' }`
- Tooltip cursor → `{ stroke: 'var(--paper-line-strong)' }`
- Grid → `{ stroke: 'var(--paper-line)', strokeDasharray: '3 3', vertical: false }`
- Animation duration 600ms, gated by reduced-motion like Task 20's Area.

(Read the current file first; keep its data plumbing exactly.)

- [ ] **Step 6: Replace `routes/links_.$id.analytics.tsx` with:**

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Copy, QrCode, MousePointerClick, Users, CalendarClock, Activity } from 'lucide-react'
import { useAnalyticsSummary, useAnalyticsTimeline, useAnalyticsReferrers, useAnalyticsDevices, useAnalyticsLocations } from '../hooks/useAnalytics'
import { copyWithToast } from '../lib/clipboard'
import { QRPopover } from '../components/ui/QRPopover'
import { StatTile } from '../components/ui/StatTile'
import { Skeleton } from '../components/ui/Skeleton'
import { StatBars } from '../components/ui/StatBars'
import { TimelineChart } from '../components/Analytics/TimelineChart'
import type { AnalyticsSummary, TimelinePoint } from '../types'

export const Route = createFileRoute('/links_/$id/analytics')({
  component: LinkAnalyticsPage,
})

const RANGES = [
  { days: 7, label: '7d', bucket: 'day' },
  { days: 30, label: '30d', bucket: 'day' },
  { days: 90, label: '90d', bucket: 'week' },
] as const

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function avgDaily(points: TimelinePoint[], days: number): number {
  const total = points.reduce((s, p) => s + p.clicks, 0)
  return points.length ? Math.round(total / days) : 0
}

function LinkAnalyticsPage() {
  const { id } = Route.useParams()
  const linkId = Number(id)
  const navigate = useNavigate()
  const [rangeIdx, setRangeIdx] = useState(0)
  const range = RANGES[rangeIdx]

  const summary = useAnalyticsSummary(linkId)
  const timeline = useAnalyticsTimeline(linkId, { bucket: range.bucket, from: isoDaysAgo(range.days) })
  const referrers = useAnalyticsReferrers(linkId)
  const devices = useAnalyticsDevices(linkId)
  const locations = useAnalyticsLocations(linkId)

  const summaryData: AnalyticsSummary | undefined = summary.data?.data
  const timelinePoints: TimelinePoint[] = timeline.data?.data ?? []

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4">
        <button
          onClick={() => navigate({ to: '/' })}
          className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Dashboard
        </button>
      </nav>

      <header className="flex flex-wrap items-center gap-3 mb-6">
        <span className="font-mono text-lg font-semibold text-accent">/{id}</span>
        <button
          onClick={() => copyWithToast(window.location.origin.replace(/:\d+$/, ':8000') + '/' + id, 'Link copied')}
          className="p-2 rounded-lg border border-line hover:bg-surface-muted transition-colors"
          aria-label="Copy short URL"
        >
          <Copy className="w-3.5 h-3.5 text-ink-muted" aria-hidden />
        </button>
        <QRPopover value={`${window.location.origin.replace(/:\d+$/, ':8000')}/${id}`} caption={`/${id}`} />
        <div role="group" aria-label="Time range" className="ml-auto flex gap-1">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRangeIdx(i)}
              aria-pressed={rangeIdx === i}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                rangeIdx === i ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-surface-muted'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5" aria-label="Summary stats">
        <StatTile icon={MousePointerClick} label="Total clicks" value={summaryData?.total_clicks ?? 0} loading={summary.isPending} />
        <StatTile icon={Users} label="Unique" value={summaryData?.unique_clicks ?? 0} loading={summary.isPending} />
        <StatTile icon={CalendarClock} label="Avg / day" value={avgDaily(timelinePoints, range.days)} loading={timeline.isPending} />
        <div className="bg-surface border border-line rounded-[var(--radius-card)] px-4 py-3.5 hover-lift">
          <div className="flex items-center gap-2 mb-1.5">
            <Activity className="w-3.5 h-3.5 text-ink-faint" aria-hidden />
            <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">Last click</span>
          </div>
          {summary.isPending ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <span className="font-mono text-lg font-semibold text-ink">{relativeTime(summaryData?.last_click_at ?? null)}</span>
          )}
        </div>
      </section>

      <section className="bg-surface border border-line rounded-[var(--radius-card)] p-5 mb-5" aria-label="Clicks over time">
        <h3 className="text-[13px] font-semibold text-ink mb-4">Clicks over time</h3>
        <div className="h-64">
          {timeline.isPending ? <Skeleton className="h-full w-full" /> : <TimelineChart data={timeline.data?.data} />}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="bg-surface border border-line rounded-[var(--radius-card)] p-5">
          {(referrers.data?.data ?? []).length === 0 && referrers.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <StatBars title="Top referrers" rows={(referrers.data?.data ?? []).map((r) => ({ key: r.source, value: r.clicks, percentage: r.percentage }))} />
          )}
        </div>
        <div className="bg-surface border border-line rounded-[var(--radius-card)] p-5">
          {devices.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="space-y-5">
              <StatBars title="Browsers" rows={(devices.data?.data?.browser ?? []).map((b) => ({ key: b.name, value: b.clicks }))} />
              <StatBars title="Operating systems" rows={(devices.data?.data?.os ?? []).map((o) => ({ key: o.name, value: o.clicks }))} />
            </div>
          )}
        </div>
        <div className="bg-surface border border-line rounded-[var(--radius-card)] p-5">
          {locations.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <StatBars
              title="Locations"
              rows={(locations.data?.data ?? []).slice(0, 8).map((l) => ({ key: [l.city, l.country].filter(Boolean).join(', '), value: l.clicks }))}
            />
          )}
        </div>
      </div>
    </div>
  )
}
```

Note: `QrCode` icon import is unused after refactor (QRPopover has its own) — drop it from imports. The copy button builds the redirect-service URL from the API origin heuristic; if `VITE_REDIRECT_URL` env exists later, prefer it (leave a comment).

- [ ] **Step 7: Delete now-unused components**

```bash
git rm frontend/src/components/Dashboard/AnalyticsCards.tsx frontend/src/components/Analytics/ReferrerList.tsx frontend/src/components/Analytics/DeviceList.tsx frontend/src/components/Analytics/LocationList.tsx frontend/src/components/Analytics/ProgressBar.tsx
```

If any are still imported elsewhere, fix those imports first (`grep -rn "AnalyticsCards\|ReferrerList\|DeviceList\|LocationList\|ProgressBar" frontend/src`).

- [ ] **Step 8: Typecheck + tests + build**

Run: `cd frontend && npx tsc --noEmit && npm test && npm run build`
Expected: green.

- [ ] **Step 9: Commit**

```bash
git add -A frontend/src
git commit -m "feat(frontend): analytics page restyle — range pills, stat tiles, StatBars lists"
```

### Task 25: Settings page

**Files:**
- Modify: `frontend/src/routes/settings.tsx` (replace content)

- [ ] **Step 1: Replace with:**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import type { CSSProperties } from 'react'
import { Mail, ShieldCheck, Sun, Moon, Monitor, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTheme, type ThemeChoice } from '../hooks/useTheme'

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
              {user?.name?.charAt(0) || '?'}
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
```

- [ ] **Step 2: Typecheck + build + commit**

Run: `cd frontend && npx tsc --noEmit && npm run build`

```bash
git add frontend/src/routes/settings.tsx
git commit -m "feat(frontend): settings page — profile, theme radio, session"
```

### Task 26: Cleanup dead code

**Files:**
- Delete: `frontend/src/routes/demo/tanstack-query.tsx` (and dir)
- Delete: `frontend/src/components/Dashboard/LinkListTable.tsx`
- Delete (if unreferenced): `frontend/src/components/Header.tsx`, `frontend/src/components/Layout/TopBar.tsx`

- [ ] **Step 1: Find references before deleting**

```bash
grep -rn "LinkListTable\|tanstack-query\|TopBar\|components/Header" frontend/src --include="*.tsx" --include="*.ts" | grep -v "routeTree.gen"
```

Expected: only self-references. Fix any stragglers first.

- [ ] **Step 2: Delete files**

```bash
git rm -r frontend/src/routes/demo frontend/src/components/Dashboard/LinkListTable.tsx
git rm frontend/src/components/Header.tsx frontend/src/components/Layout/TopBar.tsx 2>/dev/null || true
```

- [ ] **Step 3: Regenerate route tree + full verify**

Run: `cd frontend && npm run build && npm test`
Expected: routeTree regenerates without demo route; build+tests green.

- [ ] **Step 4: Commit**

```bash
git add -A frontend/src
git commit -m "chore(frontend): remove demo route and superseded components"
```

### Task 27: Accessibility + reduced-motion sweep

**Files:** various (small diffs)

- [ ] **Step 1: Run automated audit**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Fix everything reported.

- [ ] **Step 2: Manual keyboard walkthrough (dev server running)**

Checklist — fix any failure inline:
- Tab reaches sidebar nav → main content → every card action in order; focus ring always visible
- ⌘K opens palette; arrows move selection; Enter runs; Esc closes; focus returns to trigger position
- Dialogs: focus trapped; Esc closes CreateLinkPanel/DeleteConfirmDialog
- Screen-reader labels: every icon-only button announces purpose (`aria-label` present)
- Charts have `role="img"` + descriptive labels; StatBars sections labeled

- [ ] **Step 3: Reduced-motion pass**

Set OS/browser to "reduce motion". Verify: no confetti, count-ups show final values instantly, charts render fully drawn, staggered entrances appear immediately.

- [ ] **Step 4: Dark mode pass**

Toggle each theme option. Check contrast of badges/text on Warm Ink surfaces; adjust token values in `styles.css` only if a pair fails AA (spot-check with devtools contrast checker).

- [ ] **Step 5: Mobile spot-check (≥360px)**

Devtools responsive mode: dashboard tiles stack, link cards wrap actions below content, analytics grid collapses to single column. Fix overflow issues if found.

- [ ] **Step 6: Commit**

```bash
git add -A frontend/src
git commit -m "fix(frontend): accessibility and reduced-motion polish pass"
```

### Task 28: Final gates (both projects)

- [ ] **Step 1: Frontend gates**

```bash
cd frontend && npm run lint && npm test && npm run build
```

Expected: all green.

- [ ] **Step 2: api-service gates**

```bash
cd ../api-service && npm run lint && npx vitest run && npx tsc --noEmit && npm run build
```

Expected: all green.

- [ ] **Step 3: End-to-end smoke (full stack)**

```bash
./start.sh   # from repo root
```

Walk through: login → create link (confetti + toast appears, card staggers into list with sparkline once click events flow) → copy → QR scan with phone → edit → delete → analytics page renders all sections → ⌘K palette actions → theme switching persists across reload.

- [ ] **Step 4: Final commit (if smoke fixes were needed) + push branch**

```bash
git add -A
git commit -m "chore: ui redesign v2 final polish" --allow-empty
git push -u origin feat/ui-redesign-v2
```

---

## Verification Matrix (spec → task)

| Spec requirement | Task |
|---|---|
| Tokens light/dark, fonts, radius, shadows | 2 |
| Focus-visible rings, landmarks | 2, 18, 27 |
| Sidebar pill nav, footer tag, avatar menu | 18 |
| Breadcrumb | 18, 24 |
| Login redesign | 22 |
| Real stat tiles + count-ups + delta | 9, 11, 20 |
| Quick-create bar + confetti/toast | 19 |
| 14-day mini chart draws itself | 20 |
| Link cards w/ sparkline, QR, tones | 15, 16, 17 |
| Links search/filter | 23 |
| Analytics range pills, tiles, StatBars, restyled charts | 24 |
| Settings profile/theme/session | 14, 25 |
| Empty states | 11, 17 |
| Skeletons | 3, 11, 20, 24 |
| ⌘K palette | 15, 18 |
| Toasts everywhere | 12, 19, 21, 24 |
| Focus traps | 21 |
| Tri-state theme | 14 |
| Backend overview endpoint | 4, 5, 6 |
| Reduced-motion | 2, 13, 27 |
| Dead code removal | 26 |




