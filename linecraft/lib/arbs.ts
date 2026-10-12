// Cross-book discrepancies on one player prop. Pure maths, no imports beyond
// stats.ts, so node --test runs it directly.
//
// - arb: over at one book and under at another at the same line, priced so
//   that staking both (split by `stakeOver`/`stakeUnder`) returns `margin` > 0
//   whichever side wins.
// - middle: over at a lower line and under at a higher one at different books.
//   A result inside the gap wins both bets (`bothWin`); outside it one wins and
//   the return is `margin` (a small cost, or a profit when it is also an arb).
import { decimalOdds } from "./stats.ts";

export interface Quote { book: string; line: number; price: number; updatedAt?: string }
export interface BookPair { book: string; line: number; over: number; under: number; updatedAt?: string }

export interface Opportunity {
  kind: "arb" | "middle";
  over: Quote;
  under: Quote;
  // sum of the two implied probabilities; below 1 is an arb
  overround: number;
  // return on the total stake when exactly one side wins: 1 / overround - 1
  margin: number;
  // middle only: return when both win (the result lands strictly between the lines)
  bothWin: number | null;
  // share of the total stake on each side, so either winner pays the same
  stakeOver: number;
  stakeUnder: number;
}

export interface ScanOptions {
  // report arbs whose margin is above this (0 = any guaranteed profit; -0.01 also shows near-arbs)
  minMargin: number;
  // largest cost a middle may carry when it misses (0.03 = lose at most 3% of the stake)
  maxMiddleCost: number;
}

export const DEFAULT_SCAN: ScanOptions = { minMargin: 0, maxMiddleCost: 0.03 };

// Round away float noise so a dead-even pair (+105 / -105) reads as exactly 0, not an arb.
const clean = (x: number) => Math.round(x * 1e9) / 1e9;

export function pairOf(over: Quote, under: Quote): Opportunity {
  const io = 1 / decimalOdds(over.price);
  const iu = 1 / decimalOdds(under.price);
  const overround = io + iu;
  const middle = over.line < under.line;
  return {
    kind: middle ? "middle" : "arb",
    over,
    under,
    overround,
    margin: clean(1 / overround - 1),
    bothWin: middle ? clean(2 / overround - 1) : null,
    stakeOver: io / overround,
    stakeUnder: iu / overround,
  };
}

// The best arb and the best middle on one prop, if either clears its threshold.
// Only pairs from different books count: one book's own alt lines are priced
// consistently and aren't a discrepancy. An over above the under's line can
// lose both bets, so it is never paired.
export function findOpportunities(books: BookPair[], opts: ScanOptions = DEFAULT_SCAN): Opportunity[] {
  const overs: Quote[] = books.map((b) => ({ book: b.book, line: b.line, price: b.over, updatedAt: b.updatedAt }));
  const unders: Quote[] = books.map((b) => ({ book: b.book, line: b.line, price: b.under, updatedAt: b.updatedAt }));
  let arb: Opportunity | null = null;
  let middle: Opportunity | null = null;
  for (const o of overs) {
    for (const u of unders) {
      if (o.book === u.book || o.line > u.line) continue;
      const p = pairOf(o, u);
      if (p.kind === "arb") {
        if (p.margin > opts.minMargin && (!arb || p.margin > arb.margin)) arb = p;
      } else if (p.margin >= -opts.maxMiddleCost) {
        // widest gap first, then the cheaper miss
        const gap = (x: Opportunity) => x.under.line - x.over.line;
        if (!middle || gap(p) > gap(middle) || (gap(p) === gap(middle) && p.margin > middle.margin)) middle = p;
      }
    }
  }
  return [arb, middle].filter((x): x is Opportunity => x !== null);
}

// Stake amounts for a total, rounded to cents; the over gets the rounding remainder.
export function splitStake(o: Opportunity, total: number): { over: number; under: number } {
  const under = Math.round(total * o.stakeUnder * 100) / 100;
  return { over: Math.round((total - under) * 100) / 100, under };
}

// Seconds between a quote's last update and `now`; null when the feed didn't say.
export function quoteAge(q: Quote, now: Date): number | null {
  if (!q.updatedAt) return null;
  const t = Date.parse(q.updatedAt);
  return Number.isFinite(t) ? Math.max(0, Math.round((now.getTime() - t) / 1000)) : null;
}
