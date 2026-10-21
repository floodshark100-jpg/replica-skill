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
stays busy all day can use a few thousand a day. In practice it's usually well under the cap: books post props on game
day, and a game with nothing posted yet costs nothing. Measured on 12 Oct 2026, one refresh of all four sports cost 19
credits (NBA 0, no games in the window; NFL 4, one game; MLB 6, two games; NHL 9, three of six games posted).
Pick a plan to match, or raise `ODDS_API_TTL_SECONDS` / lower `ODDS_API_MAX_EVENTS`. A sport is only fetched when someone opens it, and failures are retried after a minute,
not on every request.

## Arbitrage scanner (`/arbs`)

Compares every book's price on every player prop and lists:

- **Arbs**: over at one book and under at another at the same line, priced so a split stake pays the same whichever
  side wins. Shows the margin, the stake on each side for your total, and the payout.
- **Middles**: over at a lower line and under at a higher one at different books. A result between the lines wins
  both bets; outside it you lose a little (capped at 3% by default, `cost` in the URL).

In live mode it also scans **games in play** (started in the last `ODDS_API_INPLAY_HOURS`, default 4), which the
props board leaves out. Each price shows how long ago that book last moved the market, in red past two minutes: a
stale book next to a fresh one is the usual reason an arb exists, and the usual reason it's gone when you get there.
`min=-1` in the URL (or "Near-arbs" in the form) also shows pairs within 1% of an arb. JSON: `/api/arbs?sport=nhl`.
Free plan: the first game of the slate, as on the board.

**Freshness and credits.** The scan has its own cache, `ODDS_API_SCAN_TTL_SECONDS` (default 120, minimum 30), shared by
every viewer on the server, and skips Next's fetch cache, which can hand back a stale response while it refetches. A
scan costs the same as a board refresh: on 12 Oct 2026 (NHL with one game in play) NHL 9 credits, MLB 6, NFL 4, NBA 0.
"Auto-refresh" on the page is off by default; left on with one sport open it costs about (credits per scan) x 30 an
hour (about 270 an hour for NHL at 2 minutes), so the 500-credit free tier lasts under two hours. The page shows the
credits left after each scan.

## Live scanner: deploy it privately

A deployment with your key spends your credits for anyone who can reach it, so lock it first.

1. **Vercel**: Add New > Project > import this repo. Set **Root Directory** to `linecraft`. Framework: Next.js.
2. **Environment variables** (Project > Settings > Environment Variables, Production):

   | name | value |
   | --- | --- |
   | `ODDS_API_KEY` | your key from the-odds-api.com |
   | `ACCESS_PASSWORD` | a long password you choose; the browser asks for it once (any username) |
   | `ODDS_API_MIN_CREDITS` | optional, default 25: scanning pauses below this many credits left |
   | `ODDS_API_SCAN_TTL_SECONDS` | optional, default 120: how often `/arbs` may refetch |

3. **Deploy**, open `https://<project>.vercel.app/arbs?sport=nba`, enter the password. The footer should say
   "Lines and prices from The Odds API".

With `ACCESS_PASSWORD` set, every page, API route and asset needs the password (`proxy.ts`), and everyone past it sees
every game (no free-plan lock). For scripts: `curl -u me:PASSWORD https://<project>.vercel.app/api/arbs?sport=nba`.
Without it the site is open to anyone: only do that with no key (demo mode).

**Credit guard.** After each scan the app knows how many credits are left. Below `ODDS_API_MIN_CREDITS` it stops
calling the odds endpoints and `/arbs` says "Paused to save credits"; once a minute it checks the free quota
endpoint (0 credits) and resumes by itself when credits come back (new month or a plan upgrade).

**Serverless caveat.** The scan cache lives in each server instance's memory. Vercel reuses warm instances, but
under load or after a cold start a second instance fetches its own copy, so real usage can run above the
per-scan numbers. Watch the "credits left" figure on `/arbs`; the guard is the backstop.

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
app/                 routes: / props player/[id] games games/[id] arbs matchups slip pricing account signin api/props api/arbs api/plan
components/          PropsTable, GameLogChart, SaveButton, Stat (rating badge, hit cell), SportTabs, Nav, Logo
lib/stats.ts         hit rates (pushes excluded), the rating, odds maths
lib/data.ts          the data layer every screen reads; picks demo or live
lib/demo.ts          demo source over lib/seed.ts (fictional leagues and today's slate)
lib/live.ts          live source: maps The Odds API events and player props, caches per sport
lib/odds-api.ts      the API client (config, quota headers, errors without the key)
lib/arbs.ts          arb and middle maths: overround, margin, stake split, quote age
lib/access.ts        the ACCESS_PASSWORD check; proxy.ts applies it to every request
replica/             the Replica pipeline output: recon, architecture, schema.sql, design tokens, test plan,
                     bugs, parity, review research, brand, launch, deploy checklist
```

## The rating

0-100 for the side the numbers favour: 35% L10 hit rate, 20% season, 15% L5, 15% opponent rank vs the position,
15% L10 average vs the line. Every player page shows the five parts.

Research only. Not a sportsbook. 21+. 1-800-GAMBLER.
