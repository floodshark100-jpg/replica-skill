# Pricing

## Market (read 2026-10-10, from search results, not the vendors' own pages; re-check before launch)

| product | price | source |
| --- | --- | --- |
| the original, web | $14.99/mo, $149.99/yr; free tier = one game per league | https://www.betsmart.co/tool-reviews/propfinder |
| the original, iOS in-app | $19.99/mo, $199.99/yr (one review's figure) | same search, betsmart |
| PickFinder | $14.99/mo, $39.99/qtr, $149.99/yr | https://marlvel.ai/apps/app-pickfinder |
| Prop Trackr | $9.99/mo, $79.99/yr | https://apps.apple.com/rs/app/prop-trackr-player-props/id1662595844 |
| PlayerProps.ai | $59.99/mo, $499.99/yr | https://apppricinglab.com/app/apple/6502717388 |

Billing complaints in our sample: none (3 reviews; too few to say).

## Ours

| tier | price | for |
| --- | --- | --- |
| Free | $0 | trying it: the first game of the day in every sport, every feature |
| Pro | $11.99/mo or $99/yr (2+ months free), 7-day trial | anyone betting more than one game a night |

Flat, one tier, cancel in one click, a reminder email 2 days before the trial ends.

Stripe objects for you to create (test mode first): product "Linecraft Pro"; prices `pro_monthly` 1199 USD/month and `pro_annual` 9900 USD/year, trial 7 days.
