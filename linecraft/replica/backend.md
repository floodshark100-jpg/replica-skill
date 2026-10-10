# Backend

v1 runs with no accounts and no keys: fictional seed data, a demo plan cookie, saved props in the browser.
This is the list to make it a real product. Claude does not create accounts or handle keys; you do.

## To wire, in order

1. **Data feed (blocker for launch).** Pick a licensed provider for player stats and for prop lines (odds APIs sell
   player-prop markets; official league data is licensed separately). Implement the functions in `lib/data.ts`
   against Postgres (`schema.sql`), filled by jobs:
   - `sync-lines` every 5 min on game days -> `prop_lines` upsert + `prop_line_history`
   - `sync-stats` nightly -> `player_game_stats`, then recompute `defense_ranks` and `ratings`
   Read the provider's licence: most forbid redistributing raw data, which is fine here (we show derived stats).
2. **Auth.** Supabase Auth, email magic link. Enable the `/signin` form. Account deletion that deletes.
3. **Saved props.** Move `lib/saved.ts` to the `saved_props` table (RLS already in schema). Keep localStorage as the logged-out fallback and import it on first sign-in.
4. **Payments.** Stripe Checkout for Pro (monthly + annual, 7-day trial), Customer Portal for changes.
   Webhook at `/api/stripe/webhook`: verify signature, store `event.id` in `stripe_events`, idempotent handlers for
   `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
   **Then delete `app/api/plan/route.ts` and read the plan from `subscriptions`.** The demo cookie must not ship.
5. **Email.** Resend: magic link, trial-ending reminder 2 days before, receipt.

## .env.example

See `../.env.example` (names only).

## Security checklist

- [x] no secrets in the repo; `.env*` ignored
- [x] free-tier gating is server-side; locked props never reach the client (`tests/unit/data.test.ts`, e2e F01-N1)
- [x] query params are validated and clamped server-side (e2e F01-E3, API 400 on bad sport)
- [ ] plan from the database, not a cookie (demo only today)
- [ ] authorisation tested with a second user (needs auth)
- [ ] rate limits on sign-in and the JSON API
- [ ] webhooks verify signatures
- [x] `npm audit`: 0 vulnerabilities at install
- [ ] privacy policy listing every processor (host, Supabase, Stripe, Resend, data provider)
- [ ] gambling compliance: age gate and responsible-gambling links per state/country you market in; no affiliate links until you've read each book's affiliate terms and local advertising rules
