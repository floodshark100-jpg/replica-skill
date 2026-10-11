# Linecraft

A player-prop research app, built with the Replica pack in this repo as a clean-room take on a popular prop research tool's core loop (see `replica/recon.md`):
scan every prop today, filter and sort by hit rate and matchup, open one to see its game log against the line, and
compare prices across books. Rebranded, with its own rating formula that shows its inputs.

Two data modes, picked at runtime:

- **Demo** (no key): fictional leagues, teams, players and odds from a deterministic seed (`lib/seed.ts`), with
  full game logs, so every feature works.
- **Live** (`ODDS_API_KEY` set): today's games, player-prop lines and every book's prices from
  [The Odds API](https://the-odds-api.com). The board then ranks props by **EV**: the best available price against
  the no-vig consensus of all books. Hit rates, the rating and the matchups page need game logs, which an odds feed
  doesn't have; they come back when a stats provider is connected (see `replica/backend.md`).

## Live odds

1. Get a key at the-odds-api.com (it's your account; the free tier is small, see the quota note below).
2. Put it where the app runs: `.env.local` locally, or the host's environment variables (e.g. Vercel project settings).
   ```
   ODDS_API_KEY=your-key
   ```
3. Restart. The footer switches to "Lines and prices from The Odds API".

The key stays on the server: it's only used in server-side fetches and never sent to the browser or logged.
Optional settings (regions or specific books, cache time, games per sport) are in `.env.example`.

**Quota.** Each refresh of a sport costs about (player-prop markets that come back) x (regions) per game. With the
defaults (6 games, 30-minute cache, `us`) one refresh of all four sports costs up to ~90 credits, so a site that
stays busy all day can use a few thousand a day. Pick a plan to match, or raise `ODDS_API_TTL_SECONDS` / lower
`ODDS_API_MAX_EVENTS`. A sport is only fetched when someone opens it, and failures are retried after a minute,
not on every request.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # unit tests (node --test)
npm run e2e          # Playwright, desktop + mobile, axe scans (demo mode)
npm run e2e:live     # the same app in live mode against a local mock of the odds API
                     # in a sandbox with a preinstalled browser: CHROMIUM_PATH=/path/to/chrome npm run e2e
npm run build
```

Free vs Pro gating works out of the box: `/pricing` -> "Start free trial" flips a **demo** cookie. Remove
`app/api/plan/route.ts` when Stripe is wired.

## Map

```
app/                 routes: / props player/[id] games games/[id] matchups slip pricing account signin api/props api/plan
components/          PropsTable, GameLogChart, SaveButton, Stat (rating badge, hit cell), SportTabs, Nav, Logo
lib/stats.ts         hit rates (pushes excluded), the rating, odds maths
lib/data.ts          the data layer every screen reads; picks demo or live
lib/demo.ts          demo source over lib/seed.ts (fictional leagues and today's slate)
lib/live.ts          live source: maps The Odds API events and player props, caches per sport
lib/odds-api.ts      the API client (config, quota headers, errors without the key)
replica/             the Replica pipeline output: recon, architecture, schema.sql, design tokens, test plan,
                     bugs, parity, review research, brand, launch, deploy checklist
```

## The rating

0-100 for the side the numbers favour: 35% L10 hit rate, 20% season, 15% L5, 15% opponent rank vs the position,
15% L10 average vs the line. Every player page shows the five parts.

Research only. Not a sportsbook. 21+. 1-800-GAMBLER.
