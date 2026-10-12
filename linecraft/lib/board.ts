// Filtering and sorting shared by every source.
import type { PropRow, BoardQuery, BoardResult, SortKey, ArbQuery, ArbRow } from "./types.ts";
import type { BookLine, Market, Player, SportKey } from "./seed.ts";
import { findOpportunities } from "./arbs.ts";

function sortValue(r: PropRow, key: SortKey): number | string | null {
  switch (key) {
    case "score": return r.score;
    case "ev": return r.ev;
    case "fair": return r.fair;
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

export function defaultSort(hasStats: boolean): SortKey {
  return hasStats ? "score" : "ev";
}

export function applyQuery(all: PropRow[], q: BoardQuery): BoardResult {
  const needle = q.q?.trim().toLowerCase();
  const opp = q.opp?.toUpperCase();
  let rows = all
    .filter((r) => !q.market || r.market.key === q.market)
    .filter((r) => !q.gameId || r.gameId === q.gameId)
    .filter((r) => !opp || r.opp?.abbr.toUpperCase() === opp)
    .filter((r) => !needle || r.player.name.toLowerCase().includes(needle) || r.gameLabel.toLowerCase().includes(needle) || (r.team?.name.toLowerCase().includes(needle) ?? false) || r.team?.abbr.toLowerCase() === needle);
  // a rating filter only means something where there is a rating
  if (q.minScore) rows = rows.filter((r) => r.locked || !r.hasStats || (r.score ?? 0) >= q.minScore!);
  if (q.side) rows = rows.filter((r) => r.locked || r.side === q.side);
  const key = q.sort ?? defaultSort(all.some((r) => r.hasStats));
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

export interface ScanItem {
  id: string;
  sport: SportKey;
  gameId: string;
  gameLabel: string;
  startAt: string;
  inPlay: boolean;
  player: Player;
  market: Market;
  books: BookLine[];
  locked: boolean;
}

// Every arb and middle across the props, best margin first. Locked rows are
// counted but carry no prices: a free viewer never receives them.
export function arbRows(items: ScanItem[], q: ArbQuery): { rows: ArbRow[]; total: number; locked: number } {
  const rows: ArbRow[] = [];
  for (const it of items) {
    for (const opp of findOpportunities(it.books, q)) {
      if (q.kind && opp.kind !== q.kind) continue;
      rows.push({
        id: `${it.id}~${opp.kind}`, sport: it.sport, gameId: it.gameId, gameLabel: it.gameLabel, startAt: it.startAt, inPlay: it.inPlay,
        player: it.player, market: it.market, kind: opp.kind, locked: it.locked, opp: it.locked ? null : opp,
      });
    }
  }
  rows.sort((a, b) => Number(a.locked) - Number(b.locked) || (b.opp?.margin ?? 0) - (a.opp?.margin ?? 0) || a.player.name.localeCompare(b.player.name));
  return { rows, total: rows.length, locked: rows.filter((r) => r.locked).length };
}
