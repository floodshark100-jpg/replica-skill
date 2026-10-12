# What users say, and what to do about it

**Sample size: 3.** Two App Store review excerpts and one editorial review, from web-search results. The container
could not open the App Store, review sites or Reddit, so this is far below the 100+ the method asks for.
Treat everything here as a direction, not a ranking. Every quote is in `reviews.csv` with its link; verify the wording
on the page before reusing it anywhere.

## 1. What they hate
- **Slow to load / not working** (1 review, 1 source, thin): "slow to load and most features aren't even working for me"
 : https://apps.apple.com/us/app/propfinder-prop-research/id6773949831
- **Early bugs** (1 review, 1 source, thin): "The app has some bugs right now because it's newer, they will get fixed": same link.

## 2. What is missing
- **Android** (1 editorial, thin): "mobile is iOS only with no Android app yet": https://www.betsmart.co/tool-reviews/propfinder

## 3. What is unsolved
- **Trust in the score.** The original's headline feature is a proprietary rating (source: betsmart review). Nothing in
  this sample complains about it; this is a positioning bet, not evidence. Flagged as such.

## Fix plan

| fix | size | status |
| --- | --- | --- |
| Rating with its inputs and weights on every prop | S | built |
| Server-rendered board, sorting by links, no client data fetch | S | built |
| Web that works on any phone (no app store) | S | built |
| One-click cancel | S | built (demo) |
| Collect 100+ real reviews and rerun `reviews.py` | M | to do, by you, in a browser |

## Angles

1. For bettors who don't trust a score they can't see inside, Linecraft shows the five numbers behind every rating.
   Evidence: none from reviews yet (positioning bet).
2. For Android and laptop bettors, a prop tool that works in any browser. Evidence: 1 editorial (thin).
3. For people on bad stadium Wi-Fi, a board that loads before the line moves. Evidence: 1 review (thin).

**Recommended: 1**, backed by 3 in the product. Re-check once there are real reviews.
