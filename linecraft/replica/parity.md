# Parity

**Feature score 89.5 / 100. Must-haves 12 of 12.** (`python3 replica-diff/parity.py replica/features.csv`, full output in `parity-score.md`)

**Layout score: not measured.** No screenshots of the original could be taken (network policy blocked the site and the
App Store page), so `imgdiff.py` had nothing to compare. Clone screenshots are in `clone-screens/` at 1440 and 390.
Drop the original's into `screens/` with matching names to score it.

## Missing, in build order

1. Paid checkout (Stripe): partial, demo toggle
2. Saved props on the server: partial, browser only
3. Topic cheatsheets (TD, red zone, home run)
4. Power ratings and game projections
5. Line movement history (table exists)

## Behaviour differences

| flow | original | Linecraft | keep or fix |
| --- | --- | --- | --- |
| F01 | rating is a single score | score plus its five inputs and weights | keep (the fix) |
| F01 | iOS app + web | responsive web, any phone | keep; Expo later |
| F01 | 4 clicks to a prop (recon estimate) | 3: sport tab, market chip, row | keep |
| F06 | in-app subscription on iOS | web checkout, one-click cancel | keep |

## Verdict

**Shippable as a product on seed data: no, by design.** Every must-have works and no S1/S2 is open, but the data is
fictional. It becomes shippable when a licensed feed is connected and the Stripe/auth items in `backend.md` are done.
