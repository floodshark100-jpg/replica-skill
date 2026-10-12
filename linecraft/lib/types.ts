// Shapes every screen reads, whichever source (demo seed or live odds) fills them.
import type { SportKey, Market, Team, Player, Game, BookLine } from "./seed.ts";
import type { HitRate, Rating, Side, MarketPrice } from "./stats.ts";
import type { Opportunity, ScanOptions } from "./arbs.ts";

export type Plan = "free" | "pro";
export type Mode = "demo" | "live";

export interface PropRow {
  id: string;
  sport: SportKey;
  gameId: string;
  player: Player;
  // null when the source can't say which side the player is on (odds feeds don't)
  team: Team | null;
  opp: Team | null;
  home: boolean | null;
  gameLabel: string;
  market: Market;
  line: number;
  locked: boolean;
  // false when there is no game log behind the prop (live odds without a stats feed)
  hasStats: boolean;
  side: Side | null;
  score: number | null;
  l5: HitRate | null;
  l10: HitRate | null;
  l20: HitRate | null;
  season: HitRate | null;
  h2h: HitRate | null;
  l10Avg: number | null;
  matchupRank: number | null;
  teamCount: number;
  // for `side`, at the consensus line
  bestOdds: number | null;
  fair: number | null;
  ev: number | null;
  bookCount: number;
  startAt: string;
}

export const SORTS = ["score", "ev", "fair", "player", "line", "l5", "l10", "l20", "season", "h2h", "matchup", "avg", "odds", "time"] as const;
export type SortKey = (typeof SORTS)[number];

export interface BoardQuery {
  sport: SportKey;
  market?: string;
  q?: string;
  gameId?: string;
  opp?: string;
  minScore?: number;
  side?: Side;
  sort?: SortKey;
  dir?: "asc" | "desc";
  plan: Plan;
}

export interface BoardResult {
  rows: PropRow[];
  total: number;
  locked: number;
  // live only: games on the slate, so an empty board can tell "no games" from "no props posted yet"
  games?: number;
  // set when the live source failed; rows are then empty, never filled with demo data
  error?: string;
}

export interface GameCard {
  game: Game;
  home: Team;
  away: Team;
  props: number;
  unlocked: boolean;
}

export interface LineQuote {
  line: number;
  books: BookLine[];
  price: MarketPrice;
}

export interface DemoDetail {
  kind: "demo";
  row: PropRow;
  game: Game;
  markets: Market[];
  log: { date: string; opp: Team; home: boolean; value: number }[];
  books: (BookLine & { bestOver: boolean; bestUnder: boolean })[];
  rating: Rating;
  splits: { label: string; rate: HitRate; avg: number | null }[];
  altLines: { line: number; over: HitRate; under: HitRate }[];
  matchupAllowed: number | null;
  price: MarketPrice;
}

export interface LiveDetail {
  kind: "live";
  row: PropRow;
  game: Game;
  home: Team;
  away: Team;
  markets: Market[];
  // every line any book quotes, consensus first
  lines: LineQuote[];
}

export interface LockedDetail {
  kind: "locked";
  row: PropRow;
  markets: Market[];
}

export type Detail = DemoDetail | LiveDetail | LockedDetail;

// The arbitrage scanner (/arbs): one row per discrepancy found on a prop.
export interface ArbQuery extends ScanOptions {
  sport: SportKey;
  kind?: Opportunity["kind"];
  plan: Plan;
}

export interface ArbRow {
  id: string;
  sport: SportKey;
  gameId: string;
  gameLabel: string;
  startAt: string;
  inPlay: boolean;
  player: Player;
  market: Market;
  kind: Opportunity["kind"];
  locked: boolean;
  // null when locked
  opp: Opportunity | null;
}

export interface ArbResult {
  rows: ArbRow[];
  total: number;
  locked: number;
  games: number;
  inPlay: number;
  // when these quotes were fetched, and when the next fetch may happen (live only)
  fetchedAt: string | null;
  nextAt: string | null;
  // API credits left on the key after the last fetch (live only)
  remaining: number | null;
  error?: string;
}
