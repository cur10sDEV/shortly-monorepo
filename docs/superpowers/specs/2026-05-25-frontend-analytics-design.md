# Shortly Frontend & Analytics Design

## Overview

Build a full-featured frontend for the Shortly URL shortener service, plus an analytics pipeline to track and visualize link performance. The frontend will be a React SPA with auth, link management, and analytics dashboards. Analytics will use Kafka + ElasticSearch for scalable, real-time click tracking and aggregation.

Two frontends:
1. **Admin Dashboard** (React SPA) — link management, analytics, settings
2. **Public Pages** (server-rendered JSX in redirection service) — password form, expired link page, 404 page

## Architecture

### Frontend (React + TanStack)
- **Framework:** React 19, Vite 7, TypeScript
- **Routing:** TanStack Router v1 (file-based)
- **State:** TanStack Query for server state, React state for UI state
- **Styling:** Tailwind CSS v4 with dark/light mode toggle
- **Auth:** better-auth client (Google OAuth)
- **Charts:** Recharts for analytics visualizations
- **Icons:** lucide-react

### Analytics Pipeline
- **Tracking:** Redirection service publishes click events to **Kafka** topic (`shortly-clicks`) fire-and-forget (non-blocking)
- **Consumer:** Dedicated consumer process reads from Kafka topic, parses user-agent, resolves geo, writes to **Elasticsearch**
- **Storage:** Elasticsearch index `shortly-clicks-*` with daily rollover
- **Query:** API service queries Elasticsearch for aggregated analytics via Elasticsearch client
- **Observability:** OpenTelemetry (already configured) + SigNoz for real-time monitoring

## Frontend Pages & Components

### Navigation Layout
- **Top bar:** Brand logo (left), dark/light toggle (center-right), user avatar + dropdown menu (right)
- **Sidebar:** Collapsible, nav links (Dashboard, Settings), active link highlighting
- **Mobile:** Sidebar becomes a slide-over drawer

### Routes
| Route | Component | Auth Required |
|-------|-----------|---------------|
| `/login` | LoginPage | No (redirect to / if authed) |
| `/` | DashboardPage | Yes (redirect to /login if not) |
| `/links/:id/analytics` | LinkAnalyticsPage | Yes |
| `/settings` | SettingsPage | Yes |

### Auth Flow
1. Unauthenticated users land on `/login` with a "Sign in with Google" button
2. After successful OAuth, redirect to `/`
3. `useSession()` hook from better-auth reactively manages auth state
4. Auth guard in root layout redirects to `/login` if no session
5. Sign out via dropdown menu in top bar

### Login Page (`/login`)
- Centered card with Shortly branding
- "Sign in with Google" button
- If user navigates to `/` while already authenticated → redirect to dashboard
- If user navigates to `/login` while authenticated → redirect to `/`

### Dashboard (`/`)
- **Quick-create bar:** Text input at top — paste URL, hit Enter, instant short link. CTA button opens slide-over panel for advanced options
- **Link list:** Table with: short code (copyable), long URL (truncated), click count, created date, status badge, action buttons
- **Actions per row:** Copy short URL (clipboard), View Analytics (→ `/links/:id/analytics`), Edit (opens slide-over), Delete (confirmation dialog)
- **Pagination:** Keyset-based (cursor) pagination matching the backend API
- **Empty state:** Illustration + "Create your first short link" CTA when no links exist

### Create Link (Slide-over Panel)
- Opens from dashboard (CTA button or quick-create bar)
- Fields: Long URL (required), Custom alias (optional), Password (optional), Expiry date (optional)
- On submit: POST to `/api/v1/short-url/create`, on success insert into list, close panel
- Loading state during submission, error state on failure

### Link Analytics (`/links/:id/analytics`)
- **Header:** Short link display + copy button, total clicks counter, unique clicks counter
- **Timeline chart:** Line chart (clicks over time), date range picker, day/week/month bucketing
- **Referrers:** Horizontal bar chart or ranked list showing top referrer sources
- **Devices:** Pie/donut chart showing browser, OS, and device type breakdowns
- **Locations:** Table or bar chart showing top countries/cities

### Settings (`/settings`)
- Profile display (name, email, avatar from Google)
- Theme toggle (dark/light/system)

## Analytics Pipeline

### Data Flow
```
User clicks short link
  → Redirection Service: resolves, 302 redirects
  → (fire-and-forget) publishes to Kafka topic: shortly-clicks
    → { link_id, ip, user_agent, referrer, timestamp, link_owner_id }
  → Analytics Consumer: reads from Kafka consumer group
    → Parses user-agent (ua-parser-js) → browser, OS, device_type
    → Resolves IP → country, city (ip-api.com free API)
    → Deduplicates (same IP + link_id within 1h → is_unique=false)
    → Indexes document into Elasticsearch: shortly-clicks-YYYY.MM.DD
  → API service queries ES via elasticsearch-js for aggregated stats
```

### Kafka
- Topic: `shortly-clicks`
- Partitions: 3 (default)
- Replication factor: 1 (single-node dev setup)
- Message format: `{ link_id: number, ip: string, user_agent: string, referrer: string, timestamp: string, link_owner_id: string }`
- Producer: Redirection service publishes after redirect (fire-and-forget with error logging)
- Consumer: `shortly-analytics-consumer` group, auto-commit after processing

### Elasticsearch
- Index: `shortly-clicks-*` with date-based rollover
- Mapping: keyword for link_id, ip, country, city, browser, os, device_type, referrer
- Mapping: date for timestamp
- Mapping: boolean for is_unique
- Analyzed: user_agent stored but not analyzed (just for storage)
- Aggregations: terms aggregations for referrers/devices/locations, date_histogram for timeline

### Analytics Consumer
- Located at `analytics-consumer/` in project root
- Node.js script using `kafkajs` for Kafka consumer, `@elastic/elasticsearch` for ES writes
- Uses `ua-parser-js` for user-agent parsing
- Uses ip-api.com (free tier, 45 req/min) for IP → country/city resolution
- Dockerized, runs as a separate service in docker-compose.yml
- Includes retry logic for ES writes, dead-letter logging for failed messages

### Analytics API Endpoints (on API Service)
| Endpoint | Description | ES Query |
|----------|-------------|----------|
| `GET /api/v1/links/:id/analytics/summary` | Total + unique clicks | Filter by link_id, cardinality on IP for unique |
| `GET /api/v1/links/:id/analytics/timeline` | Clicks over time | Date histogram, filtered by link_id |
| `GET /api/v1/links/:id/analytics/referrers` | Top referrers | Terms aggregation on referrer field |
| `GET /api/v1/links/:id/analytics/devices` | Browser/OS/device breakdown | Multiple terms aggregations |
| `GET /api/v1/links/:id/analytics/locations` | Geographic breakdown | Terms aggregation on country + city |

All endpoints:
- Require auth (user must own the link, validated via `link_owner_id` filter)
- Accept `?from=&to=` date filters (ISO format)
- Return JSON with `{ success: true, data: ... }` envelope
- Use Elasticsearch query filters + aggregations (no pre-computation needed initially)

### Frontend API Client
- New `src/lib/api.ts` — thin fetch wrapper with auth headers, base URL from env
- TanStack Query hooks for each endpoint
- TypeScript types for all responses

## Implementation Order

1. **Frontend: Layout + Auth** — Navigation shell (top bar + sidebar), login page, auth guard, dark/light toggle
2. **Frontend: Dashboard** — Link list with pagination, slide-over create/edit panel, delete confirmation
3. **Frontend: API client** — `src/lib/api.ts`, TanStack Query hooks, TypeScript types
4. **Infrastructure: Kafka + ES** — docker-compose setup for Kafka (KRaft) + Elasticsearch, health checks
5. **Analytics: Kafka publishing** — Redirection service publishes click events to Kafka topic
6. **Analytics: Consumer** — Kafka consumer, user-agent parsing, geo resolution, dedup, ES indexing
7. **Analytics: API endpoints** — ES query endpoints on API service (using elasticsearch-js)
8. **Frontend: Analytics** — Timeline chart, referrers, devices, locations views
9. **Frontend: Settings** — Profile display, theme preference
10. **Docker** — Frontend Dockerfile + analytics consumer in docker-compose, SigNoz config
