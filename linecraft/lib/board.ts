// Filtering and sorting shared by every source.
import type { PropRow, BoardQuery, BoardResult, SortKey } from "./types.ts";

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
