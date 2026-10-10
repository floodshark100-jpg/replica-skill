# Architecture: Linecraft (a PropFinder-style prop research app)

Reads `recon.md` and `features.csv`.

## Stack

| layer | choice | why |
| --- | --- | --- |
| web app | Next.js 16 (App Router) + TypeScript | server-rendered board is fast on first paint (slowness is the top complaint) |
| styling | plain CSS on custom properties from `design/tokens.css` | no build plugin to configure; every component uses tokens |
| data (v1) | `lib/data.ts` over a deterministic seed (`lib/seed.ts`) | runs with zero accounts or keys; same function signatures as the real layer |
| database (prod) | Postgres on Supabase | one database, RLS for the watchlist |
| stats + odds | a `DataProvider` interface, owner's licensed feed with their own keys | live sports data is licensed; we never scrape anyone's site |
| auth (prod) | Supabase Auth, email magic link | cheapest, no passwords to store |
| payments (prod) | Stripe Checkout + Customer Portal | one-click cancel |
| jobs (prod) | Vercel Cron: pull lines every 5 min on game days, stats nightly | |
| hosting | Vercel | |
| mobile | responsive web first (PWA); Expo later | original is iOS-only, a gap |

## Schema

`schema.sql` (11 tables). Highlights:

- `prop_lines` is unique on `(game_id, player_id, market, book)`; updates are upserts.
- `prop_line_history` gives line movement.
- `ratings` is computed by a job, never on read.
- `saved_props` is the only user-owned table; RLS `user_id = auth.uid()`.
- Odds stored as integer American odds; prices as cents.

## Routes

| method path | does | who | flow |
| --- | --- | --- | --- |
| GET / | landing | anyone | |
| GET /props?sport&market&q&sort&dir&min | board | anyone (free tier gating) | F01 |
| GET /player/[id]?market&window | prop detail | anyone; locked if gated | F02 |
| GET /games?sport | slate | anyone | F03 |
| GET /games/[id] | game props | anyone | F03 |
| GET /matchups?sport&position&market | defense vs position | anyone | F04 |
| GET /slip | saved props (localStorage in v1, `saved_props` in prod) | anyone | F05 |
| GET /pricing, /signin, /account | billing and account | anyone | F06 |
| GET /api/props?sport&market | JSON of the board, same filters | anyone | for the native app later |
| POST /api/stripe/webhook | subscription status (prod) | Stripe, signed | F06 |

Jobs (prod): `sync-lines` every 5 min game days, `sync-stats` 06:00 UTC,
`compute-ratings` after each sync.

## The rating (our own, published)

0-100. Weighted blend, all inputs shown on the player page:

- 35% L10 hit rate
- 20% season hit rate
- 15% L5 hit rate
- 15% matchup: opponent's rank against this position and stat (1 = softest)
- 15% cushion: (L10 average - line) / line, clamped to +/-50%

Computed for the side (over or under) the numbers favour. Formula lives in
`lib/stats.ts` with unit tests.

## Parts that bite

- Time zones: games stored UTC, shown in the viewer's zone.
- Pushes: a stat equal to the line is neither a hit nor a miss; excluded from the denominator.
- Small samples: under 5 games shows "n/a" rather than 100%.
- Feed rate limits and licence terms: cache, never fan out per viewer.
- Free tier gating must be server-side, not hidden by CSS.
- Responsible gambling: 21+/18+ notice and a helpline link in the footer.

## Build order

1. Vertical slice: board for one sport -> player page. (S02, S03)
2. Must-haves: all sports, filters, sort, rating, matchup rank, odds, gating, mobile.
3. Should-haves: games, game page, matchups, H2H, splits, search, slip, pricing/account.
4. Fixes from `fixes.md`: transparent rating breakdown, speed budget, web on any phone.
