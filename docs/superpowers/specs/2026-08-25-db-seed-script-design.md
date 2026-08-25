# Database Seed Script — Design

**Date:** 2026-08-25
**Status:** Approved
**Goal:** Populate PostgreSQL and Elasticsearch with realistic, deterministic demo data so the redesigned dashboard can be visually evaluated end-to-end.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Link ownership | Attach to the user's real login account, resolved by email |
| Volume | Medium: ~15 links × up to 90 days of history (~25–30k click docs) |
| Re-run behavior | Idempotent wipe + reseed; only touches data the script itself created |
| Ingestion path | Direct ES `_bulk` writes with pre-enriched docs (bypasses Kafka pipeline) |

## CLI Interface

```
cd api-service
npm run seed -- --email you@example.com [--days 90] [--links 15]
```

- `--email` **required** — must match an existing better-auth `user` row; script exits with a clear error otherwise ("No user found for X. Sign up via the UI first.")
- `--days` (default 90) — history depth for click generation
- `--links` (default 15) — number of links to create
- No new dependencies: reuses `pg`, `@elastic/elasticsearch`, `tsx` (all already in api-service); config read from `envs/.env.api` via the existing env parsing pattern (`DB_CONNECTION_STRING`, `ES_NODE`, `ES_INDEX_PREFIX`).

## File Layout (inside api-service)

```
scripts/seed.ts              # entrypoint: arg parsing, orchestration, summary output
scripts/seed/generator.ts    # pure: link profiles, click generation, PRNG
scripts/seed/generator.test.ts
scripts/seed/pg.ts           # wipe + insert links, resolve user
scripts/seed/es.ts           # wipe (_seed:true delete_by_query) + bulk index
```

`package.json` gains `"seed": "tsx scripts/seed.ts"`.

## PostgreSQL Seeding

1. **Resolve owner:** `SELECT id FROM "user" WHERE email = $1`. Abort if missing.
2. **Wipe previous seed:** `DELETE FROM links WHERE user_id = $1 AND short_code LIKE 'seed%'`. Real links are never touched.
3. **Insert N links** with `created_at` spread across the last 85 days:

| Count | State | Notes |
|---|---|---|
| 11 | active | evergreen targets |
| 1 | expiring soon | `expires_at = now() + 3 days` |
| 1 | expired | `expires_at = now() − 5 days` |
| 1 | deleted | `deleted_at` set 2 days ago |
| 1 | password-protected | argon2 hash of `demo1234` via existing `hashPassword()` |

- `short_code`: `seed` + 5–6 base62 chars (unique per run; prefix makes cleanup trivial)
- `long_url`: varied realistic targets (github.com, MDN, HN, Wikipedia, a blog…)
- The `ranges` table (ticket-service domain) is not modified.

## Click Generation

Pure, seeded PRNG (`mulberry32`, fixed seed) → identical dataset on every run.

Each link gets one of five traffic archetypes so charts look distinct:
`steady`, `growing`, `viral-spike` (one sharp peak ~day 20), `decaying`, `weekend-heavy`.

Per synthetic click:
- **timestamp:** day within `[max(created_at, today − --days), end]` where `end` is the link's `deleted_at`/`expires_at` when set (dead links accumulate no clicks after death), else today
- **doc shape:** exactly `EnrichedClickEvent` fields —
  `{ link_id, link_owner_id, ip, user_agent, referrer, timestamp, country, city, browser, os, device_type, is_unique }` — plus one extra field `_seed: true` (deliberate marker enabling idempotent cleanup; ignored by all aggregations)
- **referrer:** weighted pool — google 35%, direct "" 20%, twitter 20%, reddit 15%, news.ycombinator.com 10%
- **user_agent:** pool of 8 real UA strings → Chrome/Safari/Firefox/Edge/Samsung Internet across desktop/mobile/tablet (matches what `ua-parser` produces)
- **geo:** consistent country/city pairs (San Francisco, New York, London, Berlin, Bangalore, Tokyo, São Paulo, Toronto)
- **is_unique:** ≈65% — first touch per `(link_id, ip)` is unique, repeats are not
- **index routing:** docs grouped by UTC day into `{prefix}-YYYY.MM.DD` daily indices (same convention as `analytics-consumer/src/lib/elasticsearch.ts`)

Volume math: 15 archetypes × avg ~25 clicks/day × ~70 effective days ≈ 26k docs. One `_bulk` request per day-index; indices refreshed at the end.

## Elasticsearch Wipe

Before inserting: `delete_by_query` `{"query": {"term": {"_seed": true}}}` across `shortly-clicks-*`. Safe against real traffic because only the script writes `_seed`.

## Live Pipeline Smoke Check (optional, automatic)

After seeding, if redirection service is healthy at `:8000`, the script issues **one real HTTP redirect** to a seeded active short code. That click flows Kafka → consumer → ES unaided, proving the live pipeline agrees with the seeded corpus. Skipped silently if the service is down. (Its geo will be null for localhost IP — expected.)

## Output

Prints a summary table: links inserted by state, total ES docs, index count/date range, per-link totals for the top 3 links, and 3 sample short codes to open in the dashboard.

## Testing

`generator.test.ts` covers:
1. **Determinism** — same PRNG seed ⇒ identical output snapshot (link codes, click counts)
2. **Doc-shape contract** — every generated doc has exactly the `EnrichedClickEvent` keys (+`_seed`); types align with `analytics-consumer/src/types/index.ts`
3. **Day bucketing** — each doc routes to index matching its timestamp's UTC date; no doc older than its link's `created_at`; nothing in the future
4. **Distribution sanity** — referrer/device/geo values come from their pools; `is_unique` rate between 55–75%

Vitest default include already picks up `scripts/**/*.test.ts`; run gates: `npm run lint && npx vitest run && npx tsc --noEmit`.

## Out of Scope

- Redis seeding (not part of any read path for the dashboard)
- Modifying `ranges`, ticket-service, or better-auth tables beyond reading `user.id`
- Making the seeder a long-running fake-traffic daemon
