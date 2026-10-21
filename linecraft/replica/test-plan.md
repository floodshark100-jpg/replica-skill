# Test plan

Automated: `npm test` (18 unit tests, `tests/unit/`) and `npm run e2e` (19 Playwright specs x desktop 1440 + mobile 390 = 38 runs, `e2e/`).
Every e2e fails on a console error or a 5xx. axe (WCAG 2 A/AA) runs on the landing, board, player page, games, matchups, saved, pricing.

| case | what | auto |
| --- | --- | --- |
| F01-H1 | board -> NFL -> receiving yards -> sorted by rating -> player page | e2e |
| F01-H2 | sort by player asc, toggle desc, aria-sort follows | e2e |
| F01-E1 | search with no match (emoji + accent) -> empty state -> clear | e2e |
| F01-E2 | min rating 70 holds | e2e |
| F01-E3 | junk query params (bad sport, script in sort, NaN min) -> 200 | e2e |
| F01-N1 | free plan: locked games summarised; API returns null numbers for locked props | e2e + unit |
| F01-N2 | API unknown sport -> 400 | e2e |
| F02-H1 | L5/L10/L20 switch bar count, 5 rating parts, 4 books, market switch | e2e |
| F02-H2 | chart colours match the Hit/Miss column | e2e |
| F02-E1 | under 5 games -> no rating, n/a not 100% | unit |
| F02-E2 | stat equal to the line is a push, out of the denominator | unit |
| F02-N1 | free viewer on a locked game sees upsell, no table | e2e |
| F02-N2 | unknown player -> 404 page | e2e |
| F03-H1 | slate -> game -> player | e2e |
| F04-H1 | matchups -> WR -> receptions -> ranked 1st first -> props vs that defense | e2e |
| F05-H1 | save 2, slip shows 2, reload keeps them, remove, clear | e2e |
| F05-E1 | double click save never makes two copies | e2e |
| F05-E2 | corrupt localStorage -> empty state, no crash | e2e |
| F06-H1 | start trial -> every game open -> cancel -> free | e2e |
| A11Y-1 | keyboard only: skip link, tab to a prop, Enter opens it | e2e |
| data | seed deterministic per day, odds never in (-100,100), ranks 1..n, sort order, filters | unit |

Manual, not yet possible: real payments (no Stripe), email (no Resend), multi-user isolation (no auth). Listed in `backend.md`.
