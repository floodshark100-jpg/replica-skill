import type { HitRate } from "./stats.ts";

export function pct(r: HitRate | null): string {
  return r?.rate == null ? "n/a" : `${Math.round(r.rate * 100)}%`;
}

export function odds(o: number | null): string {
  if (o === null) return "n/a";
  return o > 0 ? `+${o}` : `${o}`;
}

export function num(x: number | null, digits = 1): string {
  return x === null ? "n/a" : x.toFixed(digits);
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function prob(p: number | null): string {
  return p === null ? "n/a" : `${(p * 100).toFixed(1)}%`;
}

// +3.2% / -1.0%: expected return per unit staked
export function evPct(ev: number | null): string {
  if (ev === null) return "n/a";
  const v = Math.round(ev * 1000) / 10;
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}
