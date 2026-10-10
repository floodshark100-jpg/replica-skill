# Linecraft

A player-prop research app, built with the Replica pack in this repo as a clean-room take on a popular prop research tool's core loop (see `replica/recon.md`):
scan every prop today, filter and sort by hit rate and matchup, open one to see its game log against the line, and
compare prices across books. Rebranded, with its own rating formula that shows its inputs.

**All data is fictional.** Leagues, teams, players, books and odds are generated from a deterministic seed
(`lib/seed.ts`). Real stats and odds are licensed: connect a provider with your own keys (see `replica/backend.md`).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # unit tests (node --test)
npm run e2e          # Playwright, desktop + mobile, axe scans
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
lib/seed.ts          fictional leagues and today's slate
lib/data.ts          the data layer every screen reads; swap this for the real one
replica/             the Replica pipeline output: recon, architecture, schema.sql, design tokens, test plan,
                     bugs, parity, review research, brand, launch, deploy checklist
```

## The rating

0-100 for the side the numbers favour: 35% L10 hit rate, 20% season, 15% L5, 15% opponent rank vs the position,
15% L10 average vs the line. Every player page shows the five parts.

Research only. Not a sportsbook. 21+. 1-800-GAMBLER.
