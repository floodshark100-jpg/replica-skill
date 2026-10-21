// Live source: today's games, player-prop lines and prices from The Odds API.
// An odds feed has no game logs, so rows here carry market numbers (fair
// probability, EV, best price) and no hit rates until a stats feed is added.
import { SPORTS, type SportKey, type Market, type Team, type Player, type Game, type BookLine } from "./seed.ts";
import { marketPrice } from "./stats.ts";
import { applyQuery, arbRows } from "./board.ts";
import { listEvents, eventOdds, quota, OddsApiError, type OddsApiConfig, type ApiEventOdds, type FetchLike } from "./odds-api.ts";
import type { Plan, PropRow, BoardQuery, BoardResult, GameCard, Detail, LineQuote, ArbQuery, ArbResult } from "./types.ts";

export interface LiveProp { id: string; gameId: string; playerId: string; market: string; books: BookLine[] }

// "board": upcoming games, cached for ODDS_API_TTL_SECONDS (props, games, player pages).
// "scan": also games in play, cached for the shorter ODDS_API_SCAN_TTL_SECONDS (/arbs).
export type SnapshotKind = "board" | "scan";

export interface Snapshot {
  sport: SportKey;
  kind: SnapshotKind;
  fetchedAt: string;
  teams: Map<string, Team>;
  players: Map<string, Player>;
  games: Game[];
  props: LiveProp[];
  remaining: number | null;
  warnings: string[];
}

export function slug(s: string): string {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const TWO_WORD = ["Red Sox", "White Sox", "Blue Jays", "Maple Leafs", "Golden Knights", "Blue Jackets", "Red Wings", "Trail Blazers"];

// "Boston Celtics" -> "Celtics", "Toronto Blue Jays" -> "Blue Jays"
export function nickname(full: string): string {
  const two = TWO_WORD.find((n) => full.endsWith(` ${n}`));
  if (two) return two;
  const parts = full.trim().split(/\s+/);
  return parts[parts.length - 1] || full;
}

function teamFor(sport: SportKey, name: string, teams: Map<string, Team>): Team {
  const id = `${sport}-${slug(name)}`;
  let t = teams.get(id);
  if (!t) {
    const nick = nickname(name);
    t = { id, sport, city: name.slice(0, Math.max(0, name.length - nick.length)).trim(), name: nick, abbr: nick };
    teams.set(id, t);
  }
  return t;
}

// Turn one event's odds response into props: one per player and market, with
// every book's over/under pair at every line it quotes.
export function mapEventOdds(sport: SportKey, ev: ApiEventOdds, teams: Map<string, Team>, players: Map<string, Player>): { game: Game; props: LiveProp[] } {
  const home = teamFor(sport, ev.home_team, teams);
  const away = teamFor(sport, ev.away_team, teams);
  const game: Game = { id: `${sport}-${ev.id}`, sport, homeId: home.id, awayId: away.id, startAt: ev.commence_time };
  const markets = SPORTS.find((s) => s.key === sport)!.markets;
  const byKey = new Map<string, LiveProp>();
  for (const bk of ev.bookmakers ?? []) {
    for (const mk of bk.markets ?? []) {
      const m = markets.find((x) => x.oddsApi === mk.key);
      if (!m) continue;
      const pairs = new Map<string, { name: string; point: number; over?: number; under?: number }>();
      for (const o of mk.outcomes ?? []) {
        if (!o.description || typeof o.point !== "number" || typeof o.price !== "number") continue;
        const side = o.name.toLowerCase();
        if (side !== "over" && side !== "under") continue;
        const k = `${o.description}|${o.point}`;
        const pair = pairs.get(k) ?? { name: o.description, point: o.point };
        pair[side] = o.price;
        pairs.set(k, pair);
      }
      for (const pair of pairs.values()) {
        // a book quoting one side only can't be de-vigged; leave it out
        if (pair.over === undefined || pair.under === undefined) continue;
        const pid = `${sport}-${slug(pair.name)}`;
        if (!players.has(pid)) players.set(pid, { id: pid, teamId: "", sport, name: pair.name, position: "" });
        const id = `${game.id}~${pid}~${m.key}`;
        const prop = byKey.get(id) ?? { id, gameId: game.id, playerId: pid, market: m.key, books: [] };
        const updatedAt = mk.last_update ?? bk.last_update;
        prop.books.push({ book: bk.title, line: pair.point, over: pair.over, under: pair.under, ...(updatedAt ? { updatedAt } : {}) });
        byKey.set(id, prop);
      }
    }
  }
  return { game, props: [...byKey.values()] };
}

export async function fetchSnapshot(cfg: OddsApiConfig, sport: SportKey, now: Date, fetchImpl?: FetchLike, kind: SnapshotKind = "board"): Promise<Snapshot> {
  const s = SPORTS.find((x) => x.key === sport)!;
  const startedWithin = kind === "scan" ? cfg.inPlayHours : 0;
  // the scan must see current prices: only the in-memory cache below holds it, never Next's fetch cache
  const ttl = kind === "scan" ? 0 : cfg.ttlSeconds;
  const { data: events, usage } = await listEvents(cfg, s.oddsApi, now, fetchImpl, startedWithin, ttl);
  const from = now.getTime() - startedWithin * 3600_000;
  const upcoming = events.filter((e) => Date.parse(e.commence_time) >= from).sort((a, b) => a.commence_time.localeCompare(b.commence_time)).slice(0, cfg.maxEvents);
  const teams = new Map<string, Team>();
  const players = new Map<string, Player>();
  const games: Game[] = [];
  const props: LiveProp[] = [];
  const warnings: string[] = [];
  let remaining = usage.remaining;
  const results = await Promise.allSettled(upcoming.map((e) => eventOdds(cfg, s.oddsApi, e.id, s.markets.map((m) => m.oddsApi), fetchImpl, ttl)));
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      const mapped = mapEventOdds(sport, r.value.data, teams, players);
      games.push(mapped.game);
      props.push(...mapped.props);
      if (r.value.usage.remaining !== null) remaining = remaining === null ? r.value.usage.remaining : Math.min(remaining, r.value.usage.remaining);
    } else {
      // keep the game on the slate with no props, and say why
      const e = upcoming[i];
      games.push({ id: `${sport}-${e.id}`, sport, homeId: teamFor(sport, e.home_team, teams).id, awayId: teamFor(sport, e.away_team, teams).id, startAt: e.commence_time });
      warnings.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
    }
  });
  if (upcoming.length > 0 && warnings.length === upcoming.length) throw new OddsApiError(warnings[0], 0);
  return { sport, kind, fetchedAt: now.toISOString(), teams, players, games, props, remaining, warnings: [...new Set(warnings)] };
}

// One snapshot per sport and kind per TTL, shared by every request on this server. Kept on
// globalThis because Next bundles pages and route handlers separately: a plain module-level
// Map would give /arbs and /api/arbs a cache each, and each would spend credits.
type CacheEntry = { at: number; ok: boolean; value: Promise<Snapshot> };
const g = globalThis as typeof globalThis & { __linecraftSnapshots?: Map<string, CacheEntry>; __linecraftCredits?: { remaining: number | null } };
const cache = (g.__linecraftSnapshots ??= new Map<string, CacheEntry>());
// Credits left after the last call this server made (null until the first).
const credits = (g.__linecraftCredits ??= { remaining: null });

export function creditsRemaining(): number | null {
  return credits.remaining;
}

// Below ODDS_API_MIN_CREDITS, stop spending: a public page left open (or a crawler)
// would otherwise drain the account. Re-checked on the free quota call each retry.
async function guardedFetch(cfg: OddsApiConfig, sport: SportKey, now: Date, fetchImpl: FetchLike | undefined, kind: SnapshotKind): Promise<Snapshot> {
  if (cfg.minCredits > 0 && credits.remaining !== null && credits.remaining < cfg.minCredits) {
    const u = await quota(cfg, fetchImpl);
    if (u.remaining !== null) credits.remaining = u.remaining;
    if (credits.remaining !== null && credits.remaining < cfg.minCredits) {
      throw new OddsApiError(`Paused to save credits: ${credits.remaining} left, below ODDS_API_MIN_CREDITS (${cfg.minCredits}).`, 429);
    }
  }
  const snap = await fetchSnapshot(cfg, sport, now, fetchImpl, kind);
  if (snap.remaining !== null) credits.remaining = snap.remaining;
  return snap;
}
const FAILURE_TTL_MS = 60_000;

export function snapshotTtlMs(cfg: OddsApiConfig, kind: SnapshotKind): number {
  return (kind === "scan" ? cfg.scanTtlSeconds : cfg.ttlSeconds) * 1000;
}

export function snapshot(cfg: OddsApiConfig, sport: SportKey, now = new Date(), fetchImpl?: FetchLike, kind: SnapshotKind = "board"): Promise<Snapshot> {
  const key = `${sport}|${kind}`;
  const hit = cache.get(key);
  const ttl = hit?.ok === false ? FAILURE_TTL_MS : snapshotTtlMs(cfg, kind);
  if (hit && now.getTime() - hit.at < ttl) return hit.value;
  const entry = { at: now.getTime(), ok: true, value: guardedFetch(cfg, sport, now, fetchImpl, kind) };
  entry.value.catch(() => { entry.ok = false; });
  cache.set(key, entry);
  return entry.value;
}

export function clearCache() {
  cache.clear();
  credits.remaining = null;
}

function consensusLine(books: BookLine[]): number {
  const counts = new Map<number, number>();
  for (const b of books) counts.set(b.line, (counts.get(b.line) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

function firstGameId(snap: Snapshot): string | undefined {
  return [...snap.games].sort((a, b) => a.startAt.localeCompare(b.startAt) || a.id.localeCompare(b.id))[0]?.id;
}

function buildRow(snap: Snapshot, prop: LiveProp, plan: Plan): PropRow {
  const g = snap.games.find((x) => x.id === prop.gameId)!;
  const home = snap.teams.get(g.homeId)!;
  const away = snap.teams.get(g.awayId)!;
  const m: Market = SPORTS.find((s) => s.key === snap.sport)!.markets.find((x) => x.key === prop.market)!;
  const line = consensusLine(prop.books);
  const locked = plan !== "pro" && firstGameId(snap) !== g.id;
  const base = {
    id: prop.id, sport: snap.sport, gameId: g.id, player: snap.players.get(prop.playerId)!, team: null, opp: null, home: null,
    gameLabel: `${away.abbr} @ ${home.abbr}`, market: m, line, locked, hasStats: false,
    score: null, l5: null, l10: null, l20: null, season: null, h2h: null, l10Avg: null, matchupRank: null, teamCount: 0,
    bookCount: new Set(prop.books.map((b) => b.book)).size, startAt: g.startAt,
  };
  if (locked) return { ...base, side: null, bestOdds: null, fair: null, ev: null };
  const price = marketPrice(prop.books.filter((b) => b.line === line));
  const side = (price.ev.under ?? -Infinity) > (price.ev.over ?? -Infinity) ? "under" : "over";
  return { ...base, side, bestOdds: price.best[side], fair: price.fair?.[side] ?? null, ev: price.ev[side] };
}

export async function board(cfg: OddsApiConfig, q: BoardQuery): Promise<BoardResult> {
  try {
    const snap = await snapshot(cfg, q.sport);
    return { ...applyQuery(snap.props.map((p) => buildRow(snap, p, q.plan)), q), games: snap.games.length };
  } catch (e) {
    return { rows: [], total: 0, locked: 0, error: e instanceof Error ? e.message : "The odds API failed." };
  }
}

export async function gameCards(cfg: OddsApiConfig, sport: SportKey, plan: Plan): Promise<{ cards: GameCard[]; error?: string }> {
  try {
    const snap = await snapshot(cfg, sport);
    const first = firstGameId(snap);
    const cards = [...snap.games]
      .sort((a, b) => a.startAt.localeCompare(b.startAt) || a.id.localeCompare(b.id))
      .map((g) => ({ game: g, home: snap.teams.get(g.homeId)!, away: snap.teams.get(g.awayId)!, props: snap.props.filter((p) => p.gameId === g.id).length, unlocked: plan === "pro" || g.id === first }));
    return { cards };
  } catch (e) {
    return { cards: [], error: e instanceof Error ? e.message : "The odds API failed." };
  }
}

export async function gameById(cfg: OddsApiConfig, id: string): Promise<{ game: Game; home: Team; away: Team } | null> {
  const sport = SPORTS.find((s) => id.startsWith(`${s.key}-`))?.key;
  if (!sport) return null;
  const snap = await snapshot(cfg, sport).catch(() => null);
  const g = snap?.games.find((x) => x.id === id);
  return g && snap ? { game: g, home: snap.teams.get(g.homeId)!, away: snap.teams.get(g.awayId)! } : null;
}

export async function playerName(cfg: OddsApiConfig, id: string): Promise<string | null> {
  const sport = SPORTS.find((s) => id.startsWith(`${s.key}-`))?.key;
  if (!sport) return null;
  const snap = await snapshot(cfg, sport).catch(() => null);
  return snap?.players.get(id)?.name ?? null;
}

export async function propDetail(cfg: OddsApiConfig, playerId: string, marketKey: string | undefined, plan: Plan): Promise<Detail | null> {
  const sport = SPORTS.find((s) => playerId.startsWith(`${s.key}-`))?.key;
  if (!sport) return null;
  const snap = await snapshot(cfg, sport).catch(() => null);
  if (!snap) return null;
  const mine = snap.props.filter((p) => p.playerId === playerId);
  if (mine.length === 0) return null;
  const prop = mine.find((p) => p.market === marketKey) ?? mine[0];
  const markets = SPORTS.find((s) => s.key === sport)!.markets.filter((m) => mine.some((p) => p.market === m.key));
  const row = buildRow(snap, prop, plan);
  if (row.locked) return { kind: "locked", row, markets };
  const g = snap.games.find((x) => x.id === prop.gameId)!;
  const byLine = new Map<number, BookLine[]>();
  for (const b of prop.books) byLine.set(b.line, [...(byLine.get(b.line) ?? []), b]);
  const lines: LineQuote[] = [...byLine.entries()]
    .sort((a, b) => (a[0] === row.line ? -1 : b[0] === row.line ? 1 : a[0] - b[0]))
    .map(([line, books]) => ({ line, books, price: marketPrice(books) }));
  return { kind: "live", row, game: g, home: snap.teams.get(g.homeId)!, away: snap.teams.get(g.awayId)!, markets, lines };
}

// The arbitrage scanner: the "scan" snapshot (games in play included, short cache).
export async function arbs(cfg: OddsApiConfig, q: ArbQuery, now = new Date()): Promise<ArbResult> {
  try {
    const snap = await snapshot(cfg, q.sport, now, undefined, "scan");
    const first = firstGameId(snap);
    const games = new Map(snap.games.map((g) => [g.id, g]));
    const items = snap.props.map((p) => {
      const g = games.get(p.gameId)!;
      return {
        id: p.id, sport: snap.sport, gameId: g.id, gameLabel: `${snap.teams.get(g.awayId)!.abbr} @ ${snap.teams.get(g.homeId)!.abbr}`, startAt: g.startAt,
        inPlay: Date.parse(g.startAt) <= now.getTime(), player: snap.players.get(p.playerId)!,
        market: SPORTS.find((s) => s.key === snap.sport)!.markets.find((m) => m.key === p.market)!, books: p.books, locked: q.plan !== "pro" && g.id !== first,
      };
    });
    const fetched = Date.parse(snap.fetchedAt);
    return {
      ...arbRows(items, q),
      games: snap.games.length,
      inPlay: snap.games.filter((g) => Date.parse(g.startAt) <= now.getTime()).length,
      fetchedAt: snap.fetchedAt,
      nextAt: new Date(fetched + snapshotTtlMs(cfg, "scan")).toISOString(),
      remaining: snap.remaining,
    };
  } catch (e) {
    return { rows: [], total: 0, locked: 0, games: 0, inPlay: 0, fetchedAt: null, nextAt: null, remaining: null, error: e instanceof Error ? e.message : "The odds API failed." };
  }
}
