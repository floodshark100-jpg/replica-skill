// The data layer. Every screen reads through these functions, so swapping the
// seed for a licensed feed or Postgres changes this file and nothing else.
import { buildSeed, SPORTS, type Seed, type SportKey, type Sport, type Market, type Team, type Player, type Game, type BookLine, type GameLogEntry } from "./seed.ts";
import { hitRate, average, last, rating, favouredSide, bestOdds, MIN_SAMPLE, type HitRate, type Rating, type Side } from "./stats.ts";

export type Plan = "free" | "pro";
export type { SportKey, Sport, Market, Team, Player, Game, BookLine, HitRate, Rating, Side };
export { SPORTS };

let cache: { day: string; seed: Seed } | null = null;

// Rebuilt once per UTC day so "today's games" stay today.
export function seed(now = new Date()): Seed {
  const day = now.toISOString().slice(0, 10);
  if (!cache || cache.day !== day) cache = { day, seed: buildSeed(now) };
  return cache.seed;
}

export function isSport(s: string | undefined | null): s is SportKey {
  return SPORTS.some((x) => x.key === s);
}
export function sport(key: SportKey): Sport {
  return SPORTS.find((s) => s.key === key)!;
}
export function market(sportKey: SportKey, key: string): Market | undefined {
  return sport(sportKey).markets.find((m) => m.key === key);
}
export function team(id: string): Team {
  return seed().teams.find((t) => t.id === id)!;
}
export function teams(sportKey: SportKey): Team[] {
  return seed().teams.filter((t) => t.sport === sportKey);
}
export function player(id: string): Player | undefined {
  return seed().players.find((p) => p.id === id);
}

export function games(sportKey: SportKey): Game[] {
  return seed().games.filter((g) => g.sport === sportKey).sort((a, b) => a.startAt.localeCompare(b.startAt) || a.id.localeCompare(b.id));
}
export function game(id: string): Game | undefined {
  return seed().games.find((g) => g.id === id);
}

// Free plan: the first game of the day in each sport is fully open.
export function isUnlocked(g: Game, plan: Plan): boolean {
  return plan === "pro" || games(g.sport)[0]?.id === g.id;
}

export function consensusLine(books: BookLine[]): number {
  const counts = new Map<number, number>();
  for (const b of books) counts.set(b.line, (counts.get(b.line) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

function matchup(oppId: string, position: string, marketKey: string) {
  const s = seed();
  const row = s.defense.find((d) => d.teamId === oppId && d.position === position && d.market === marketKey);
  const n = s.teams.filter((t) => t.sport === team(oppId).sport).length;
  // PRA has no defence table of its own; use points as the proxy
  if (!row && marketKey === "pra") return matchup(oppId, position, "points");
  return { rank: row?.rank ?? Math.ceil(n / 2), allowed: row?.allowed ?? null, teams: n };
}

export interface PropRow {
  id: string;
  sport: SportKey;
  gameId: string;
  player: Player;
  team: Team;
  opp: Team;
  home: boolean;
  market: Market;
  line: number;
  locked: boolean;
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
  bestOdds: number | null;
  startAt: string;
}

function values(log: GameLogEntry[], key: string): number[] {
  return log.filter((e) => key in e.stats).map((e) => e.stats[key]);
}

function buildRow(propId: string, plan: Plan): PropRow | null {
  const s = seed();
  const prop = s.props.find((p) => p.id === propId);
  if (!prop) return null;
  const g = game(prop.gameId)!;
  const p = player(prop.playerId)!;
  const t = team(p.teamId);
  const home = g.homeId === t.id;
  const opp = team(home ? g.awayId : g.homeId);
  const m = market(p.sport, prop.market)!;
  const line = consensusLine(prop.books);
  const locked = !isUnlocked(g, plan);
  const mu = matchup(opp.id, p.position, m.key);
  const base = { id: prop.id, sport: p.sport, gameId: g.id, player: p, team: t, opp, home, market: m, line, locked, teamCount: mu.teams, startAt: g.startAt };
  if (locked) {
    // Gated on the server: a free viewer never receives these numbers.
    return { ...base, side: null, score: null, l5: null, l10: null, l20: null, season: null, h2h: null, l10Avg: null, matchupRank: null, bestOdds: null };
  }
  const log = s.logs.get(p.id)!;
  const vals = values(log, m.key);
  const l10Avg = average(last(vals, 10));
  const side = favouredSide(l10Avg, line);
  const h2hVals = values(log.filter((e) => e.opponentId === opp.id), m.key);
  const l5 = hitRate(last(vals, 5), line, side);
  const l10 = hitRate(last(vals, 10), line, side);
  const season = hitRate(vals, line, side);
  const r = rating({ l5: l5.rate, l10: l10.rate, season: season.rate, matchupRank: mu.rank, teams: mu.teams, l10Avg, line, side, sample: vals.length });
  return {
    ...base,
    side,
    score: r.score,
    l5,
    l10,
    l20: hitRate(last(vals, 20), line, side),
    season,
    h2h: h2hVals.length ? hitRate(h2hVals, line, side) : null,
    l10Avg,
    matchupRank: mu.rank,
    bestOdds: bestOdds(prop.books.filter((b) => b.line === line).map((b) => (side === "over" ? b.over : b.under))),
  };
}

export const SORTS = ["score", "player", "line", "l5", "l10", "l20", "season", "h2h", "matchup", "avg", "odds", "time"] as const;
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

function sortValue(r: PropRow, key: SortKey): number | string | null {
  switch (key) {
    case "score": return r.score;
    case "player": return r.player.name;
    case "line": return r.line;
    case "l5": return r.l5?.rate ?? null;
    case "l10": return r.l10?.rate ?? null;
    case "l20": return r.l20?.rate ?? null;
    case "season": return r.season?.rate ?? null;
    case "h2h": return r.h2h?.rate ?? null;
    // rank 1 is the softest matchup, so "best first" is ascending rank
    case "matchup": return r.matchupRank === null ? null : -r.matchupRank;
    case "avg": return r.l10Avg;
    case "odds": return r.bestOdds;
    case "time": return r.startAt;
  }
}

export function board(q: BoardQuery): { rows: PropRow[]; total: number; locked: number } {
  const needle = q.q?.trim().toLowerCase();
  let rows = seed().props
    .filter((p) => p.gameId.startsWith(`${q.sport}-`))
    .filter((p) => !q.market || p.market === q.market)
    .filter((p) => !q.gameId || p.gameId === q.gameId)
    .map((p) => buildRow(p.id, q.plan)!)
    .filter((r) => !q.opp || r.opp.abbr === q.opp.toUpperCase())
    .filter((r) => !needle || r.player.name.toLowerCase().includes(needle) || r.team.name.toLowerCase().includes(needle) || r.team.abbr.toLowerCase() === needle);
  if (q.minScore) rows = rows.filter((r) => r.locked || (r.score ?? 0) >= q.minScore!);
  if (q.side) rows = rows.filter((r) => r.locked || r.side === q.side);
  const key = q.sort ?? "score";
  const dir = q.dir ?? (key === "player" || key === "time" ? "asc" : "desc");
  rows.sort((a, b) => {
    if (a.locked !== b.locked) return a.locked ? 1 : -1;
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    if (va === vb) return a.player.name.localeCompare(b.player.name) || a.market.key.localeCompare(b.market.key);
    if (va === null) return 1;
    if (vb === null) return -1;
    const c = va < vb ? -1 : 1;
    return dir === "asc" ? c : -c;
  });
  return { rows, total: rows.length, locked: rows.filter((r) => r.locked).length };
}

export interface PropDetail {
  row: PropRow;
  game: Game;
  markets: Market[];
  log: { date: string; opp: Team; home: boolean; value: number }[];
  books: (BookLine & { bestOver: boolean; bestUnder: boolean })[];
  rating: Rating;
  splits: { label: string; rate: HitRate; avg: number | null }[];
  altLines: { line: number; over: HitRate; under: HitRate }[];
  matchupAllowed: number | null;
}

export function propDetail(playerId: string, marketKey: string | undefined, plan: Plan): PropDetail | { locked: true; row: PropRow; markets: Market[] } | null {
  const s = seed();
  const p = player(playerId);
  if (!p) return null;
  const mine = s.props.filter((x) => x.playerId === playerId);
  if (mine.length === 0) return null;
  const prop = mine.find((x) => x.market === marketKey) ?? mine[0];
  const markets = mine.map((x) => market(p.sport, x.market)!);
  const row = buildRow(prop.id, plan)!;
  if (row.locked) return { locked: true, row, markets };
  const g = game(prop.gameId)!;
  const log = s.logs.get(p.id)!.filter((e) => row.market.key in e.stats);
  const vals = log.map((e) => e.stats[row.market.key]);
  const side = row.side!;
  const mu = matchup(row.opp.id, p.position, row.market.key);
  const homeVals = log.filter((e) => e.home).map((e) => e.stats[row.market.key]);
  const awayVals = log.filter((e) => !e.home).map((e) => e.stats[row.market.key]);
  const bestO = bestOdds(prop.books.map((b) => b.over));
  const bestU = bestOdds(prop.books.map((b) => b.under));
  const step = row.line >= 40 ? 10 : row.line >= 10 ? 2 : 1;
  const altLines = [-2, -1, 0, 1, 2]
    .map((k) => row.line + k * step)
    .filter((l) => l > 0)
    .map((l) => ({ line: l, over: hitRate(vals, l, "over"), under: hitRate(vals, l, "under") }));
  return {
    row,
    game: g,
    markets,
    log: log.map((e) => ({ date: e.date, opp: team(e.opponentId), home: e.home, value: e.stats[row.market.key] })),
    books: prop.books.map((b) => ({ ...b, bestOver: b.over === bestO, bestUnder: b.under === bestU })),
    rating: rating({ l5: row.l5!.rate, l10: row.l10!.rate, season: row.season!.rate, matchupRank: mu.rank, teams: mu.teams, l10Avg: row.l10Avg, line: row.line, side, sample: vals.length }),
    splits: [
      { label: "Home", rate: hitRate(homeVals, row.line, side), avg: average(homeVals) },
      { label: "Away", rate: hitRate(awayVals, row.line, side), avg: average(awayVals) },
    ],
    altLines,
    matchupAllowed: mu.allowed,
  };
}

export interface MatchupRow { team: Team; allowed: number; rank: number; games: Game | undefined }

export function matchups(sportKey: SportKey, position: string, marketKey: string): MatchupRow[] {
  const s = seed();
  return s.defense
    .filter((d) => d.position === position && d.market === marketKey && d.teamId.startsWith(`${sportKey}-`))
    .sort((a, b) => a.rank - b.rank)
    .map((d) => ({ team: team(d.teamId), allowed: d.allowed, rank: d.rank, games: s.games.find((g) => g.homeId === d.teamId || g.awayId === d.teamId) }));
}

export function positions(sportKey: SportKey): string[] {
  return [...new Set(sport(sportKey).markets.flatMap((m) => m.positions))];
}

export function propCount(gameId: string): number {
  return seed().props.filter((p) => p.gameId === gameId).length;
}

export { MIN_SAMPLE };
