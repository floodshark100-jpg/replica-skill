# Deploy checklist: Linecraft

Date: 2026-10-10  Go from user: **not yet**. Nothing has been deployed.

## Preflight

- [x] e2e suite green: 38 passed / 38 (19 specs x desktop + mobile), axe clean on 7 screens
- [x] unit tests: 18 / 18
- [x] typecheck and production build pass
- [x] no open S1 or S2 bugs (`bugs.md`)
- [x] parity: must-haves 12 / 12, feature score 89.5
- [x] rebrand sweep clean (`sweep.py` exit 0)
- [x] store listing passes (`listing.py` 0 errors, 0 warnings), for a later Expo build
- [x] contrast: 17 pairs, 0 AA failures
- [x] `npm audit`: 0 vulnerabilities
- [x] live odds wired (The Odds API, `ODDS_API_KEY`); live-mode e2e green against a mock
- [ ] **checked against the real odds API with your key** (market keys accepted, quota per refresh as expected)
- [ ] stats feed connected (hit rates, rating and matchups are demo-only until then)
- [ ] **demo plan cookie removed, Stripe wired** (blocker: anyone can turn on Pro)
- [ ] privacy policy and terms live, every processor listed
- [ ] account deletion works (no accounts yet)
- [ ] name checks run (`brand.md`), logo made from the brief
- [ ] gambling-advertising rules checked for every market you sell in

**Verdict: not ready for production.** Fine to deploy as a public demo (it says "fictional data" in the footer).

## When you're ready

Vercel: import the repo, set the root directory to `linecraft/`, framework Next.js, no env vars needed for the demo.
Production env vars: the names in `.env.example`, set in the Vercel project, live keys only there.

Domain (after you buy it):

| record | name | value |
| --- | --- | --- |
| A | @ | Vercel's apex IP, shown in Project > Domains |
| CNAME | www | `cname.vercel-dns.com` |
| TXT | @ | SPF from Resend |
| CNAME/TXT | per Resend | DKIM |
| TXT | _dmarc | `v=DMARC1; p=none; rua=mailto:you@yourdomain` |

Pick apex or www as canonical and redirect the other.

## Watch

Error tracking (Sentry or Vercel's), uptime on `/` and `/api/props?sport=nba`, privacy-friendly analytics,
and an alert when `sync-lines` hasn't run for 15 minutes on a game day (stale lines are the worst failure for this product).
