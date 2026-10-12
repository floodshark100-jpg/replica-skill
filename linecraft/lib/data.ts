// The data layer every screen reads. With ODDS_API_KEY set it serves live
// lines and prices from The Odds API; without it, the fictional demo seed.
// A live failure is reported as an error, never papered over with demo data.
import { SPORTS, type SportKey, type Sport, type Market, type Team, type Player, type Game, type BookLine } from "./seed.ts";
import { oddsConfig } from "./odds-api.ts";
import { DEFAULT_SCAN } from "./arbs.ts";
import * as demo from "./demo.ts";
import * as live from "./live.ts";
import type { Mode, Plan, BoardQuery, BoardResult, GameCard, Detail, ArbQuery, ArbResult } from "./types.ts";

export * from "./types.ts";
export type { SportKey, Sport, Market, Team, Player, Game, BookLine };
export type { HitRate, Rating, Side, MarketPrice } from "./stats.ts";
export type { MatchupRow } from "./demo.ts";
export { SPORTS };
export { MIN_SAMPLE } from "./stats.ts";
export { DEFAULT_SCAN, splitStake, quoteAge, type Opportunity } from "./arbs.ts";

export function mode(): Mode {
  return oddsConfig() ? "live" : "demo";
}

// How far ahead the live slate looks, in hours (null in demo mode).
export function lookAheadHours(): number | null {
  return oddsConfig()?.hoursAhead ?? null;
}

// How often the arbitrage scan may refetch, and how long after the start a game counts as in play (live only).
export function scanSettings(): { seconds: number; inPlayHours: number } | null {
  const cfg = oddsConfig();
  return cfg ? { seconds: cfg.scanTtlSeconds, inPlayHours: cfg.inPlayHours } : null;
}

export function isSport(s: string | undefined | null): s is SportKey {
  return SPORTS.some((x) => x.key === s);
}
export function sport(key: SportKey): Sport {
  return SPORTS.find((s) => s.key === key)!;
}

export async function board(q: BoardQuery): Promise<BoardResult> {
  const cfg = oddsConfig();
  return cfg ? live.board(cfg, q) : demo.board(q);
}

// Scanner settings from URL params (percent values), clamped; shared by /arbs and /api/arbs.
export function arbQuery(get: (k: string) => string | undefined | null, plan: Plan): ArbQuery & { stake: number } {
  const num = (k: string, d: number, lo: number, hi: number) => {
    const v = get(k);
    const n = v === undefined || v === null || v === "" ? NaN : Number(v);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
  };
  const sportRaw = get("sport");
  const kind = get("kind");
  return {
    sport: isSport(sportRaw) ? sportRaw : "nba",
    kind: kind === "arb" || kind === "middle" ? kind : undefined,
    minMargin: num("min", DEFAULT_SCAN.minMargin * 100, -5, 20) / 100,
    maxMiddleCost: num("cost", DEFAULT_SCAN.maxMiddleCost * 100, 0, 10) / 100,
    stake: Math.round(num("stake", 100, 1, 100_000)),
    plan,
  };
}

export async function arbs(q: ArbQuery): Promise<ArbResult> {
  const cfg = oddsConfig();
  return cfg ? live.arbs(cfg, q) : demo.arbs(q);
}

export async function gameCards(sportKey: SportKey, plan: Plan): Promise<{ cards: GameCard[]; error?: string }> {
  const cfg = oddsConfig();
  return cfg ? live.gameCards(cfg, sportKey, plan) : { cards: demo.gameCards(sportKey, plan) };
}

export async function gameById(id: string): Promise<{ game: Game; home: Team; away: Team } | null> {
  const cfg = oddsConfig();
  if (cfg) return live.gameById(cfg, id);
  const g = demo.game(id);
  return g ? { game: g, home: demo.team(g.homeId), away: demo.team(g.awayId) } : null;
}

export async function playerName(id: string): Promise<string | null> {
  const cfg = oddsConfig();
  return cfg ? live.playerName(cfg, id) : demo.player(id)?.name ?? null;
}

export async function propDetail(playerId: string, marketKey: string | undefined, plan: Plan): Promise<Detail | null> {
  const cfg = oddsConfig();
  return cfg ? live.propDetail(cfg, playerId, marketKey, plan) : demo.propDetail(playerId, marketKey, plan);
}

// Defense vs position needs game logs, so it exists in demo mode only.
export function matchups(sportKey: SportKey, position: string, marketKey: string): demo.MatchupRow[] | null {
  return mode() === "live" ? null : demo.matchups(sportKey, position, marketKey);
}

export function positions(sportKey: SportKey): string[] {
  return [...new Set(sport(sportKey).markets.flatMap((m) => m.positions))];
}

export function team(id: string): Team | undefined {
  return mode() === "demo" ? demo.team(id) : undefined;
}
