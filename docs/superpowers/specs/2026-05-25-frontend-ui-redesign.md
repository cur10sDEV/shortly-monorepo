# Frontend UI Redesign — Shortly

## Direction: Modern SaaS

Clean, professional SaaS aesthetic inspired by Linear, Vercel, and Cal.com. Indigo-teal color palette, dark sidebar, card-based layouts, refined typography, subtle micro-interactions.

## Color System

- **Primary:** Indigo (`#4F46E5` / `#6366F1` / `#EEF2FF`)
- **Accent:** Teal (`#0D9488` / `#14B8A6` / `#F0FDFA`)
- **Neutrals:** Slate (`#0F172A` through `#F8FAFC`)
- **Danger:** Red (`#DC2626` / `#FEF2F2`)
- **Success:** Green (`#059669` / `#F0FDF4`)

## Typography

- Font: Inter (body, headings)
- Monospace: SF Mono / Fira Code (short URLs, code)
- Scale: 28px bold (titles) → 18px semibold (sections) → 14px medium (body) → 12px (captions)

## Layout & Navigation

- **TopBar**: Removed — navigation moves entirely to sidebar
- **Sidebar**: Dark background (`slate-900`), 4 nav items with icons:
  - Dashboard (`/`)
  - Links (`/links`)
  - Analytics (`/analytics`)
  - Settings (`/settings`)
- **User menu**: Avatar + name at bottom of sidebar with dropdown
- **Breadcrumb**: Subtle page path indicator above page title
- **Main content**: Light background (`slate-50` light / `slate-950` dark), `max-w-6xl` centered

## Dashboard Redesign

- **Stat cards row**: Total Links, Total Clicks, Active Links (3 cards with icons)
- **Quick-create bar**: Inline URL input with icon prefix + "Shorten" button + "+" for advanced
- **Link cards** (replacing table): Each link rendered as a horizontal card showing:
  - Short URL (monospace, indigo) + status badge (Active/Expired/Protected)
  - Long URL (truncated, secondary text)
  - Click count with compact display
  - Action buttons row: Copy / Analytics / Edit / Delete
- **Status badges**: Active (green), Expired (red), Protected (amber)
- **Pagination**: "Showing X of Y" label + prev/next buttons

## Analytics Redesign

- **4 stat cards**: Total Clicks (with trend indicator), Unique Clicks, Avg Daily, Last Click
- **Timeline chart**: Recharts LineChart (keep existing), refined colors (indigo + teal)
- **Referrers**: Progress bars with percentage labels (replaces Recharts BarChart)
- **Browsers / OS**: Simple percentage lists with labeled bars
- **Locations**: Country flags + percentage bars
- **Short URL**: Displayed at top of page for context

## Login Page

- Centered card on dark-tinted background
- Logo + tagline
- Dark "Sign in with Google" button with icon
- Subtle shadow + border

## Settings Page

- Profile card with avatar, name, email
- Account type display
- Sections for future settings

## Interactive Details

- **Loading**: Shimmer skeletons (instead of `animate-pulse` generic gray)
- **Empty states**: Illustrated empty state for "No links yet" with action CTA
- **Hover/active**: Refined transition on all interactive elements
- **Dark mode**: Full `.dark` support matching the new palette
- **Notification**: Copy-to-clipboard toast/notification
- **Sidebar**: Active state indicator, smooth transitions

## Component Inventory

| Component | Changes |
|---|---|
| `AdminLayout` | New — TopBar removed, sidebar as primary nav, breadcrumb added |
| `Sidebar` | Dark theme, 4 items, user at bottom, active indicator |
| `LinkListTable` → `LinkCardList` | Cards replace table, click count visible, status badges |
| `QuickCreateBar` | Refined styling, integrated icon |
| `AnalyticsCards` | 4 cards instead of 2, trend badges |
| `ReferrersChart` → `ReferrerList` | Progress bars instead of BarChart |
| `DevicesChart` | Simplified percentage list with mini bars |
| `LocationsTable` | Country flags + percentage bars |
| `LoginPage` | Refined card, dark button |
| `SettingsPage` | Richer profile card |
| `DeleteConfirmDialog` | Refined styling |
| `CreateLinkPanel` | Refined slide-over |
| Loading/Skeleton | Shimmer animation |
| EmptyState | Illustrated empty state component |
| Toast | Copy notification component |
