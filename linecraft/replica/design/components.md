# Components

All in `components/` and `app/globals.css`, on the tokens in `tokens.css`. No raw hex in components.

```
Button        variants primary, secondary, ghost · sizes sm 32px, md 40px, lg 48px
              states default, hover, focus-visible (2px accent ring), disabled
              a11y real <button> or <a>; Save uses aria-pressed and a full label ("Save Owen Ingram Points under 22.5")
              used on all
Sport tabs    4 links, aria-current on the active one · S02 S04 S06
Chip          toggle link, aria-current="true" when active · markets, windows, positions, billing period
Props table   sortable headers are links (works without JS), aria-sort on the active column,
              visually hidden caption, columns past L10 hidden under 640px (table also scrolls)
              states: filled, empty ("No props match" + Clear filters), free-plan summary card for locked games
Rating badge  0-100 · ≥75 success, 60-74 accent, <60 neutral · aria-label "Rating 70 of 100" · "–" when no rating
Hit cell      percent + optional hits/decided · ≥60% success, ≤40% danger, else neutral · "n/a" when no decided games
Side tag      OVER success / UNDER danger, uppercase xs
Game log chart  bars coloured hit/miss/push for the side shown, dashed accent line at the prop line,
              role="img" with a full text description of every game
Meter         rating part bar, decorative (value printed beside it)
Game card     link card: time, prop count, lock marker
Banner        accent-bordered notice: free-plan locked games
Pricing card  current plan gets the accent border
```
