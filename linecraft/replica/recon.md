# Recon map: PropFinder (web + iOS)

Scope: the core research loop. Browse today's player props by sport, filter and
sort them by hit rate and matchup, open one prop to see the game log against the
line, and keep a shortlist. Not the original's data feeds, picks content or
community.
For: the repo owner, as their own prop research product to sell.
Date: 2026-10-10

## How this recon was done (read this first)

Public sources only, via web search. The container's network policy blocked
direct page loads of propfinder.app, the App Store page and review sites, so no
screenshots were taken and `replica/screens/` is empty. Every claim below is
from search-result summaries of the sources listed, and is marked with a
confidence. Before trusting the layout side of this map, open the sources
yourself and drop screenshots into `replica/screens/`.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | marketing site | https://propfinder.app/ | sports covered (NBA, NFL, MLB, NHL, CFB, WNBA), props with hit rates and matchup ranks; cheatsheets (TD, rushing, red zone, line and coverage matchups), power ratings, game projections |
| 2 | App Store listing | https://apps.apple.com/us/app/propfinder-prop-research/id6773949831 | cheatsheets with L5 / L10 / L20 hit rates; filter by matchup, line, book or trend; sort by edge; mixed reviews |
| 3 | third-party review | https://www.betsmart.co/tool-reviews/propfinder | "PF rating" scores each prop instead of a raw projection; ~$14.99/mo or $149.99/yr on web; free tier = one game per league with a reduced prop set; iOS only, no Android |
| 4 | third-party roundup | https://www.betsmart.co/articles/prop-finder-tools-guide | category context: Outlier, PickFinder, Props.cash and similar |
| 5 | vendor blog | https://blog.propfinder.app/ | not read (blocked) |
| 6 | public walkthrough | https://www.youtube.com/watch?v=A_VHTHI1q4I | "home run matchup cheatsheet" tutorial; title only, not watched |

## Core loop

Find a player prop worth betting today: scan a sortable board of every prop
with hit rates and a matchup grade, then open one to check its game log
against the line.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | landing | / | pitch, sports, pricing link | hero, sport chips, CTA | filled (confidence: high) |
| S02 | props board (cheatsheet) | /props?sport=nba | every prop today with hit rates, rating, matchup | sport tabs, market chips, filter bar, sortable table, rating badge, hit-rate cells | filled, empty filter result, locked rows on free tier (high) |
| S03 | player prop detail | /player/{id}?market= | is this one prop a bet | game log bar chart vs line, L5/L10/L20/season tiles, home/away split, H2H, matchup rank, odds by book | filled (medium) |
| S04 | games (slate) | /games?sport= | today's games | game cards, time, teams, prop count | filled, no games today (medium) |
| S05 | game detail | /games/{id} | props for one game | game header, props table filtered to the game | filled (medium) |
| S06 | matchups (defense vs position) | /matchups?sport= | which defenses give up a stat | rank table, heat colouring | filled (medium; sources mention "matchup ranks" and coverage/line matchup cheatsheets) |
| S07 | saved props / slip | /slip | shortlist of props being considered | list, remove, clear, totals | empty, filled (guess) |
| S08 | pricing | /pricing | free vs paid | tier cards, monthly/annual toggle | filled (high) |
| S09 | sign in | /signin | account | email form | default, error (guess) |
| S10 | account | /account | plan, sign out | plan card | free, paid (guess) |

## Flows

```
F01 Find a prop worth betting
    S02 board -> pick sport -> filter market -> sort by rating -> S03 prop detail
    happy path clicks: 4
    edge: no props for a sport today, filter returns nothing, free tier hits a locked row

F02 Check one prop in depth
    S03 -> switch L5/L10/L20/season window -> switch alt line -> compare books
    happy path clicks: 2
    edge: player with fewer than 5 games, line at exactly the average (push)

F03 Research a game
    S04 slate -> S05 game -> S03
    happy path clicks: 2
    edge: no games today

F04 Find soft matchups
    S06 matchups -> pick position and stat -> sort -> jump to S02 filtered to that opponent
    happy path clicks: 3

F05 Build a shortlist
    S02 or S03 -> save prop -> S07 slip -> remove / clear
    happy path clicks: 2
    edge: same prop saved twice, prop line moved since saving

F06 Upgrade
    S02 locked row -> S08 pricing -> checkout -> S10 account shows paid
    edge: card declined, cancel
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Sport tabs | NBA, NFL, MLB, NHL (CFB, WNBA in original) | default, active, focus | S02, S04, S06 |
| Chip (market / filter) | toggle | default, active, focus, disabled | S02, S03, S06 |
| Props table | sortable columns | loading, empty, filled, locked row | S02, S05 |
| Rating badge | 0-100, tiered colour | n/a | S02, S03, S05, S07 |
| Hit-rate cell | L5, L10, L20, season, H2H | good / neutral / bad tint | S02, S03 |
| Game log chart | bars vs line | over / under / push | S03 |
| Odds list | per book, best highlighted | n/a | S03 |
| Game card | | scheduled | S04 |
| Button | primary, secondary, ghost | default, hover, focus, disabled | all |
| Pricing card | free, paid | current plan | S08 |

## Inferred data model

```
Sport       key, name, markets
            evidence: source 1 sport list; confidence: high
Team        id, sport, name, abbr
            confidence: high
Player      id, team_id, name, position
            confidence: high
Game        id, sport, home_team_id, away_team_id, start_at
            evidence: "game projections" (1); confidence: high
PlayerGameStat  player_id, game_id or date, opponent_id, home, stats (json by market)
            evidence: L5/L10/L20 hit rates (2) need a per-game log; confidence: high
PropLine    id, game_id, player_id, market, line, book, over_odds, under_odds, updated_at
            evidence: "filter by ... line, book" (2); confidence: high
DefenseRank team_id, position, market, rank, allowed_per_game
            evidence: "matchup ranks" (1); confidence: medium
Rating      prop_line_id, score 0-100, inputs
            evidence: "PF rating" (3); formula unknown; confidence: medium
User        id, email, plan (free | pro), watchlist
            evidence: pricing (3); confidence: high
```

Relationships: Sport 1-n Team 1-n Player 1-n PlayerGameStat; Game 1-n PropLine;
Player 1-n PropLine; Team 1-n DefenseRank; User n-n PropLine (saved).

## Feature matrix

See `features.csv`. Must: 12, should: 8, could: 5, skip: 4.

## Out of scope (cannot or should not be cloned)

- The original's stats and odds feeds. Real sports data and live odds are
  licensed. The clone ships with a provider interface and fictional seed data;
  the owner plugs in a licensed feed (e.g. a paid odds API, an official stats
  provider) with their own keys.
- Its PF rating formula (proprietary, unknown). The clone has its own,
  published, rating.
- Any picks, articles or community content.
- Real player names, team names and logos in seed data.

## Size

Screens 10, flows 6, entities 9. Hard parts: licensed live data ingestion and
refresh, the rating model, keeping the board fast with thousands of props
(a top complaint is slowness). Size: M for the research product on seed data,
L with real feeds, auth and billing in production.
