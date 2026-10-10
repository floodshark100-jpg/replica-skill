# Bugs

None open. Found and fixed during the build:

### BUG-001: free plan board lists every locked row
- Severity: S3 · F01 · S02 · Chrome 1194, 1440px
- Steps: open /props on the free plan.
- Expected: the open game's props, then a way to unlock the rest. Actual: 48 open rows followed by 144 locked rows of upsell text.
- Evidence: first screenshot pass. Status: fixed (locked games collapse into one summary card; e2e F01-N1).

### BUG-002: game log bars coloured backwards on unders
- Severity: S2 · F02 · S03
- Steps: open any prop whose side is Under.
- Expected: green = a game that cashed the under. Actual: green = over the line, so cashed unders showed red.
- Status: fixed (bars are hit/miss for the side shown; e2e F02-H2 checks bars against the Hit/Miss column).

### BUG-003: Season hit rate always equal to L20
- Severity: S3 · F01/F02
- Cause: seed logs were exactly 20 games. Status: fixed (12-40 game seasons).

## To check

- A keypress during hydration (first ~100ms) on the board was once dropped in a headless run. Not reproduced since
  across 12 runs; the keyboard spec now waits for network idle. Check on a slow real phone.
- `replica-entrepreneur/reviews.py` crashes (`AttributeError: 'list' object has no attribute 'strip'`) when a CSV row
  has an unquoted comma in the text. Tooling bug in the pack, not the app.
