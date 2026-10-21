# Brand: Linecraft

## Name

Linecraft: working the line, carefully. Chosen to share no sound, shape or word with the original (no "prop", no "finder").
Other candidates kept: Edgeboard, Tallyline, Overcast Stats, Hitwell.

| check | Linecraft | result |
| --- | --- | --- |
| USPTO (classes 9, 42) | tmsearch.uspto.gov | to run |
| EUIPO / TMview | euipo.europa.eu | to run |
| Canada | ised-isde.canada.ca | to run |
| WIPO Global Brand DB | branddb.wipo.int | to run |
| domain | linecraft.app / .com / getlinecraft.com | to run |
| App Store / Play | exact-name search | to run |
| handles | X, Instagram, TikTok, GitHub | to run |
| web | "linecraft sports betting" | to run |

None of these were run (no network to those hosts here). They are screening, not clearance: a trademark lawyer before you spend on the name.

## Palette

Dark-first; amber accent `#f4b740` on near-black `#0e1116`; success green / danger coral for hit and miss.
`contrast.py`: 17 pairs, 0 AA failures. The original's colours couldn't be measured (no screenshots), so
`brand.json` has no colours to sweep for yet. Add them once you have screenshots.

## Logo brief

A rising line crossing a dashed threshold, in a rounded amber square (the placeholder in `components/Logo.tsx` and `app/icon.svg`).
Wordmark + symbol. Must read at 16px. Deliverables: SVG, 1024 iOS icon (no transparency), favicon set, 1200x630 social image.
Must not resemble the original's mark: put theirs beside the drafts and check.

## Voice

Plain, numerate, calm. Plain not dumbed down; numerate not jargon; calm not hype.

| do | don't |
| --- | --- |
| "70% of his last 10 went under" | "LOCK OF THE DAY 🔒🔥" |
| "Free covers the first game of the day" | "Unlock premium edges!!" |
| "No props match" | "Oops! Something went wrong" |
| show the number and how it was made | promise wins |
| "Research only. Not a sportsbook." | imply guaranteed profit |

## Sweep

`python3 replica-brand/sweep.py linecraft --config linecraft/replica/brand.json` -> clean (exit 0).
