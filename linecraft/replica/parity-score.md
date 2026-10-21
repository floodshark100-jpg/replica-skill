## Parity: 89.5 / 100

features 89.5  (25 counted, must-haves 12 of 12 done)

## By area, weakest first
- cheatsheets                    0.0  (1 features)
- slip                          50.0  (1 features)
- platform                      75.0  (2 features)
- billing                       80.0  (2 features)
- games                         80.0  (3 features)
- player                        93.3  (7 features)
- board                        100.0  (8 features)
- matchups                     100.0  (1 features)

## Missing, in build order
- [should] billing: Paid plan checkout and account, partial  (demo cookie toggle; Stripe Checkout and webhook not wired)
- [should] slip: Save props to a shortlist, partial  (saved in the browser only; saved_props table and auth not wired)
- [could] cheatsheets: Topic cheatsheets (TD red zone home run), no
- [could] games: Power ratings and game projections, no
- [could] platform: Native iOS app, no  (responsive web instead; Expo later)
- [could] player: Line movement history, no  (table in schema.sql; no UI)

## Left out on purpose (not scored)
- Live licensed stats and odds feed: licensed data: the owner brings a feed with their own keys
- Original's PF rating formula: proprietary and unknown; the clone has its own published formula
- CFB and WNBA leagues: scoped out of v1; same code path as other sports
- Picks and community content: their content not a feature

## Yours, not in the original (not scored)
- Rating breakdown shown on every prop
- Server-rendered board fast on slow connections
- Works on Android and any browser
- One-click cancel
