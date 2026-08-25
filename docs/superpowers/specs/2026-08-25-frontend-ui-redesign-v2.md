# Shortly Frontend Redesign v2 — "Warm Paper / Dev-tool"

Date: 2026-08-25
Status: Approved (design validated interactively via visual companion)
Supersedes: `2026-05-25-frontend-ui-redesign.md` (v1, implemented)

## Goal

Make the frontend interview-worthy: a distinctive, polished, accessible UI that feels hand-crafted by a senior engineer — not generated. Every page gets the treatment; the wow comes from typography, motion quality, and delightful details rather than flashy gradients.

## Decisions Log (validated with owner)

| Decision | Choice |
|---|---|
| Direction | Light Refined → **Warm Paper** (Notion-like palette) |
| Typography | **Space Grotesk** headings · **Inter** body · **JetBrains Mono** numerals/codes/kbd |
| Scope | Full app: login, dashboard, links, analytics, settings, shared layout |
| Delight features | ⌘K command palette · QR popover per link · sparklines in link cards · toasts + animated count-ups · confetti on link creation |
| Motion | Approved demo set: 120–250ms micro / 400–600ms entrances, single easing, reduced-motion kills all |
| Dark mode | Kept as "Warm Ink" variant of same system |
| Sparkline data | **Option A**: new backend endpoint `GET /user/analytics/overview` |
| Time series window | 14 days everywhere (dashboard mini-chart, card sparklines) — single window keeps the endpoint simple |

Non-goals: no routing changes, no auth flow changes, no redirection-service changes, no new pages.

---

## 1. Design Tokens

Defined in `frontend/src/styles.css` via Tailwind v4 `@theme`. Semantic names only in components (`bg-surface`, `text-ink`, `border-line`, etc.) — never raw hex.

### Light ("Warm Paper")

| Token | Value | Use |
|---|---|---|
| `canvas` | `#F8F7F4` | app background |
| `surface` | `#FFFFFF` | cards, inputs |
| `surface-muted` | `#F3F1EC` | sidebar, hover fills |
| `line` | `#E8E5DE` | borders |
| `line-strong` | `#D9D5CC` | input borders |
| `ink` | `#37352F` | primary text |
| `ink-muted` | `#787774` | secondary text |
| `ink-faint` | `#A19F97` | placeholders |
| `accent` | `#4F46E5` | links, short codes, primary CTA |
| `accent-soft` | `#EEF0FF` | active nav pill bg |
| `teal` | `#0D9488` | success/secondary chart series |
| `green` | `#0F7B6C` | positive delta, Active badge |
| `amber` | `#B45309` | Expired badge |
| `red` | `#DC2626` | danger actions, Deleted badge |
| `purple` | `#7C3AED` | Protected badge |

### Dark ("Warm Ink")

Canvas `#1C1B18` · surface `#262421` · surface-muted `#211F1C` · line `#38352F` · line-strong `#454138` · ink `#EDEAE4` · ink-muted `#A8A49B` · ink-faint `#6E6A62` · accent `#818CF8` · accent-soft `rgba(129,140,248,.14)` · status colors lightened one step for AA contrast on dark surfaces.

### Shape & elevation

Radius: 10px cards / 8px buttons+inputs / full pills for badges & nav.
Shadow (hover/floating only): `0 10px 24px -8px rgba(28,27,24,.16)`; palette/dialog: `0 16px 40px -12px rgba(28,27,24,.25)`.

### Typography scale

Space Grotesk: page titles 20px/700, section titles 14px/600, stat numerals 22–30px/700 tracking `-0.02em`.
Inter: body 13–14px/400-500, captions 11–12px.
JetBrains Mono: all numerals in stats/deltas (`tabular-nums`), short codes, dates, kbd hints, version tag.

Fonts self-hosted via npm (`@fontsource-variable/space-grotesk`, `@fontsource-variable/inter`, `@fontsource/jetbrains-mono`) — no Google Fonts CDN dependency; works offline in dev.

---

## 2. Layout & Navigation

**Sidebar** re-skinned to Warm Paper: `surface-muted` background, `line` border. Logo = ink rounded-square mark + "shortly*" wordmark in Space Grotesk (asterisk motif). Nav items: pill-shaped (full radius); active = `accent-soft` bg + `accent` text; idle = `ink-muted`. Footer block: JetBrains Mono `v1.x · self-hosted` tag, theme toggle, avatar + name with sign-out menu.

**TopBar**: none (unchanged from v1). Breadcrumb (`Dashboard / Analytics / shrt.ly/9xKp`) above page title, `ink-faint`.

**Content column**: `max-w-6xl` centered, 24px gutters.

---

## 3. Page Specs

### Login
Centered card on canvas with subtle grid-paper texture (CSS background). Wordmark, tagline "Shorten anything. Track everything.", ink-black Google button with official multi-color G icon. Entrance: card fades/rises 300ms. Spinner state on button while redirecting.

### Dashboard
1. Header row: Space Grotesk greeting ("Good evening, {first name}"), right side: date + `⌘K` kbd hint.
2. Quick-create bar: white input (placeholder `https://paste-a-long-url.com…`), ink-black **Shorten** button, `+` icon-button opening CreateLinkPanel (password/expiry). On success: confetti burst (~14 particles, indigo/teal/amber/red) + toast + new card animates into list.
3. Stat tiles ×3 (Total Links, Total Clicks + delta badge, Active Links): numerals count up 600ms on mount, delta badges pulse once. Delta = sum of clicks in days 8–14 vs days 1–7 of the overview series (computed client-side; no extra endpoint data needed).
4. Clicks timeline mini-chart (14 days, area chart, ink stroke on paper fill) — draws itself on mount.
5. Link card list (see Components) with staggered entrance (40ms/card).
6. Empty state (no links): illustrated paperclip/link illustration, CTA focuses quick-create input.

### Link Cards
Row layout: mono indigo short code → status badge (Active/Expired/Protected) → truncated target URL (muted) → 14-day sparkline (SVG polyline, teal, tooltip on hover showing date+count) → total click count (mono) → icon buttons: Copy, QR, Edit, Analytics, Delete. Copy shows toast + brief ✓ morph. Hover: lift + shadow + `line-strong` border. Delete opens focus-trapped confirm dialog (reskinned).

### Links Page
Same list component at fuller width; toolbar adds client-side search input (filters by code/target) + status filter pills (All/Active/Expired/Protected).

### Analytics (`links_.$id.analytics`)
Header: breadcrumb, short code (mono) + Copy + QR buttons. Range picker pills: 7d / 30d / 90d (drives `from/to/bucket` params). Four stat tiles w/ count-ups: Total Clicks (+trend), Unique Clicks, Avg Daily, Last Click (relative time). Timeline chart: Recharts AreaChart restyled to tokens (indigo stroke, gradient fill → transparent, mono axis labels, custom tooltip styled like cards). Below: Referrers / Devices / Locations as labeled horizontal progress lists with percentages (mono). Loading: shimmer skeletons matching final layout.

### Settings
Profile card (avatar, name, email, provider badge). Appearance section: theme radio group (Light / Dark / System). Session section: sign-out-all button. Danger zone styling reserved.

### Empty/error/loading states
Every async region gets a skeleton variant shaped like its content (shimmer animation exists today, reskinned to Warm Paper tones). Error states: inline card with retry button, toast on mutation failure.

---

## 4. Component Inventory

New components (`src/components/ui/` unless noted):

| Component | Notes |
|---|---|
| `CommandPalette` | ⌘K / Ctrl+K global. Fuzzy search over links (code + target) and nav commands (go to pages, create link, toggle theme, copy any visible link's URL). Built on `cmdk`. Spring-in scale .94→1 + fade. Focus trapped; ESC closes; arrow-key nav; Enter runs. Trigger hint in dashboard header + sidebar footer. |
| `QRPopover` | Button on each link card + analytics header. Popover shows SVG QR (from `qrcode.react`) encoding the public short URL, short code caption, "Scan to open". |
| `Sparkline` | Pure SVG (~40 lines): polyline + end-dot + optional hover dots. Props: `points: number[]`, width/height. No dependency. |
| `Toaster` / `useToast()` | Built on `sonner`, themed to tokens, top-right slide-in, 2.5s auto-dismiss, ARIA live region. Used for copy/save/delete/create feedback. |
| `CountUp` | Hook + span; rAF count-up 600ms with ease-out, `tabular-nums`; respects reduced-motion (jumps to final). |
| `Confetti` | Wrapper around `canvas-confetti`, token colors, ~14 particles, fires once per creation. Disabled under reduced-motion. |
| `StatTile` | Label + CountUp numeral + optional delta badge + icon. |
| `EmptyState` | Icon/illustration + message + CTA. |
| `Skeleton` variants | Shimmer blocks composed per page. |

Reskinned existing: `AdminLayout`, `Sidebar`, `AuthGuard` (adds loading shell), `QuickCreateBar`, `LinkListTable` → becomes `LinkCardList` (same props contract), `CreateLinkPanel`, `DeleteConfirmDialog`, analytics lists, `ThemeToggle`, login/settings/analytics routes.

Removed: legacy `demo/tanstack-query` route, unused `Header.tsx` if unreferenced.

## 5. Motion Spec

- Easing everywhere: `cubic-bezier(.2,.8,.2,1)`.
- Micro-interactions 120–250ms (hover lift, button press scale .98, badge pulse).
- Entrances 400–600ms: staggered card rise (translateY 14px→0 + fade, 40ms stagger), chart path draw (stroke-dashoffset), count-up 600ms, toast slide 200ms, palette spring 200ms.
- Confetti: single 1s burst.
- `prefers-reduced-motion: reduce`: all animations/transitions become instant; confetti disabled; count-up renders final value; charts render fully drawn.
- Rule: motion communicates state change only — no decorative loops in the app.

## 6. Accessibility

- Visible `:focus-visible` rings (2px accent, offset 2) on every interactive element.
- Full keyboard support: ⌘K palette, tab order matches visual order, dialogs focus-trapped + restore focus on close, all icon-buttons have `aria-label`s.
- Toasts: `role="status"` aria-live via sonner defaults.
- Contrast: all text/background pairs WCAG AA (verified against tokens; ink on paper ≈ 9.9:1; accent-on-white ≥ 4.5:1 for text usage).
- Semantic landmarks (`nav`, `main`, `header`), one `h1` per page, chart summaries via `aria-label` + visually-hidden table alternative for analytics data.
- Theme toggle also honors `prefers-color-scheme` when set to System.

## 7. Backend Addition (api-service)

**Endpoint**: `GET /api/v1/user/analytics/overview` (requireAuth).

Response:
```json
{
  "success": true,
  "data": {
    "totals": { "total_links": 128, "total_clicks": 48204, "active_links": 121 },
    "per_link": [
      { "link_id": 42, "short_code": "9xKp", "clicks_total": 812,
        "clicks_14d": [0,3,1,7,12,4,2,9,5,3,8,11,6,4] }
    ]
  }
}
```

Implementation:
- `totals.total_links` / `active_links`: PG count on user's links (active = not deleted, not expired). PG also returns the user's 100 most-recent non-deleted link ids + short codes (same query shape as existing `get user links` data access).
- `clicks_total` and `per_link`: Elasticsearch aggregation filtered by `link_owner_id = user.id` AND `link_id` in that recent-100 id list; terms agg on `link_id` with `date_histogram` (calendar_interval: 1d, 14 days) sub-aggregation; missing days backfilled with 0 server-side; `doc_count` sums give per-link and total clicks.
- New files mirror existing structure: `user/data-access` additions + `analytics/queries.ts` addition; route added to user router. ~60–80 lines total.
- Frontend consumes via new `analyticsApi.overview()`; React Query caches it (staleTime 60s); sparklines/stat tiles join by `link_id`.

Fallback: if overview request fails, dashboard still renders (tiles show `—`, sparklines hidden) — no hard dependency.

## 8. Dependencies

Frontend adds: `cmdk`, `sonner`, `qrcode.react`, `canvas-confetti` (+`@types/canvas-confetti`), three `@fontsource/*` packages. No other runtime deps; Sparkline/CountUp are hand-rolled.

## 9. Testing & Verification

- Frontend (vitest + testing-library, already configured): unit tests for `CountUp`, `Sparkline`, `CommandPalette` (open/nav/run), toast integration on copy, status-badge derivation, search filter. All existing tests keep passing.
- api-service (vitest): route test for `/user/analytics/overview` with mocked data-access returning fixture ES aggregation; validates auth requirement + shape + zero-backfill logic.
- Manual QA checklist: keyboard-only walkthrough, reduced-motion pass, dark-mode contrast pass, empty-state pass, mobile ≥360px layout.
- Gates before done: `npm run lint && npm run test && npm run build` green in `frontend/` and `api-service/`.

## 10. Rollout

Single branch, conventional commits per work-unit (tokens → layout → components → pages → backend endpoint). Visual regression is acceptable-by-design here (intentional redesign); behavior regressions are not — existing hooks/api contracts unchanged except additive `overview()`.
