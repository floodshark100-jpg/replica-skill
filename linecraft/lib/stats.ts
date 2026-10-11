// Pure prop math. No imports, so node --test runs it directly.

export type Side = "over" | "under";

export interface HitRate {
  hits: number;
  misses: number;
  pushes: number;
  // null when there is no decided game in the sample (all pushes or empty)
  rate: number | null;
}

// A stat equal to the line is a push: neither a hit nor a miss.
export function hitRate(values: number[], line: number, side: Side): HitRate {
  let hits = 0;
  let misses = 0;
  let pushes = 0;
  for (const v of values) {
    if (v === line) pushes++;
    else if ((v > line) === (side === "over")) hits++;
    else misses++;
  }
  const decided = hits + misses;
  return { hits, misses, pushes, rate: decided === 0 ? null : hits / decided };
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Most recent game first. `last(values, 5)` = the last five games played.
export function last<T>(values: T[], n: number): T[] {
  return values.slice(0, n);
}

export const MIN_SAMPLE = 5;

export interface RatingInputs {
  l5: number | null;
  l10: number | null;
  season: number | null;
  // opponent's rank against this position and stat, 1 = gives up the most
  matchupRank: number;
  teams: number;
  l10Avg: number | null;
  line: number;
  side: Side;
  sample: number;
}

export interface RatingPart {
  key: "l10" | "season" | "l5" | "matchup" | "cushion";
  label: string;
  weight: number;
  // 0..1, how good this input is for the chosen side
  value: number;
}

export interface Rating {
  score: number | null;
  parts: RatingPart[];
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

// Linecraft's published rating, 0-100. See replica/architecture.md.
export function rating(i: RatingInputs): Rating {
  if (i.sample < MIN_SAMPLE || i.l10 === null || i.season === null || i.l5 === null || i.l10Avg === null || i.line <= 0) {
    return { score: null, parts: [] };
  }
  // matchup: rank 1 is the softest defence for overs, the toughest for unders
  const soft = i.teams <= 1 ? 0.5 : 1 - (i.matchupRank - 1) / (i.teams - 1);
  const matchup = i.side === "over" ? soft : 1 - soft;
  const margin = clamp((i.l10Avg - i.line) / i.line, -0.5, 0.5);
  const cushion = 0.5 + (i.side === "over" ? margin : -margin);
  const parts: RatingPart[] = [
    { key: "l10", label: "Last 10 hit rate", weight: 0.35, value: i.l10 },
    { key: "season", label: "Season hit rate", weight: 0.2, value: i.season },
    { key: "l5", label: "Last 5 hit rate", weight: 0.15, value: i.l5 },
    { key: "matchup", label: "Opponent matchup", weight: 0.15, value: matchup },
    { key: "cushion", label: "L10 average vs line", weight: 0.15, value: cushion },
  ];
  const score = Math.round(100 * parts.reduce((s, p) => s + p.weight * p.value, 0));
  return { score: clamp(score, 0, 100), parts };
}

// The side the numbers favour: over when the L10 average beats the line.
export function favouredSide(l10Avg: number | null, line: number): Side {
  return l10Avg !== null && l10Avg < line ? "under" : "over";
}

// American odds -> implied probability, for comparing books.
export function impliedProbability(american: number): number {
  return american < 0 ? -american / (-american + 100) : 100 / (american + 100);
}

// Higher payout is better for the bettor.
export function bestOdds(odds: number[]): number | null {
  if (odds.length === 0) return null;
  return odds.reduce((best, o) => (impliedProbability(o) < impliedProbability(best) ? o : best));
}

// American odds -> decimal payout per 1 staked (stake included).
export function decimalOdds(american: number): number {
  return american > 0 ? 1 + american / 100 : 1 + 100 / -american;
}

// Remove the book's margin from a two-way price: scale both implied
// probabilities so they sum to 1 (the multiplicative method).
export function noVig(over: number, under: number): { over: number; under: number } {
  const o = impliedProbability(over);
  const u = impliedProbability(under);
  return { over: o / (o + u), under: u / (o + u) };
}

// Expected return per 1 staked when the true chance is `prob`.
export function expectedValue(prob: number, american: number): number {
  return prob * decimalOdds(american) - 1;
}

export interface MarketPrice {
  // consensus no-vig probability of each side, averaged over books quoting both sides
  fair: { over: number; under: number } | null;
  best: { over: number | null; under: number | null };
  ev: { over: number | null; under: number | null };
}

// Fair odds and EV at one line, from every book quoting that line.
export function marketPrice(quotes: { over: number; under: number }[]): MarketPrice {
  if (quotes.length === 0) return { fair: null, best: { over: null, under: null }, ev: { over: null, under: null } };
  const fairs = quotes.map((q) => noVig(q.over, q.under));
  const fair = {
    over: fairs.reduce((s, f) => s + f.over, 0) / fairs.length,
    under: fairs.reduce((s, f) => s + f.under, 0) / fairs.length,
  };
  const best = { over: bestOdds(quotes.map((q) => q.over)), under: bestOdds(quotes.map((q) => q.under)) };
  return {
    fair,
    best,
    ev: {
      over: best.over === null ? null : expectedValue(fair.over, best.over),
      under: best.under === null ? null : expectedValue(fair.under, best.under),
    },
  };
}
