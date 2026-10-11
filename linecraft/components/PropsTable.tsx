import Link from "next/link";
import type { PropRow, SortKey } from "@/lib/data.ts";
import { evPct, num, odds, ordinal, prob } from "@/lib/format.ts";
import { Hit, RatingBadge, SideTag } from "./Stat.tsx";
import { SaveButton } from "./SaveButton.tsx";

type Col = { key: SortKey; label: string; num?: boolean; hideSm?: boolean; title?: string; cell: (r: PropRow) => React.ReactNode; tone?: (r: PropRow) => string };

const evTone = (r: PropRow) => (r.ev === null ? "" : r.ev > 0 ? "rank-soft" : "muted");

const RATING: Col = { key: "score", label: "Rating", num: true, title: "Linecraft rating, 0-100", cell: (r) => <RatingBadge score={r.score} /> };
const EV: Col = { key: "ev", label: "EV", num: true, title: "Expected return at the best price against the no-vig consensus", cell: (r) => <span className="mono">{evPct(r.ev)}</span>, tone: evTone };
const BEST: Col = { key: "odds", label: "Best odds", num: true, cell: (r) => <span className="mono">{odds(r.bestOdds)}</span> };

// With game logs: the research columns. Odds only: the market columns.
const STATS_COLS: Col[] = [
  RATING,
  { key: "l5", label: "L5", num: true, title: "Hit rate, last 5 games", cell: (r) => <Hit r={r.l5} /> },
  { key: "l10", label: "L10", num: true, title: "Hit rate, last 10 games", cell: (r) => <Hit r={r.l10} /> },
  { key: "l20", label: "L20", num: true, hideSm: true, title: "Hit rate, last 20 games", cell: (r) => <Hit r={r.l20} /> },
  { key: "season", label: "Season", num: true, hideSm: true, cell: (r) => <Hit r={r.season} /> },
  { key: "h2h", label: "H2H", num: true, hideSm: true, title: "Hit rate against today's opponent", cell: (r) => <Hit r={r.h2h} showCount /> },
  {
    key: "matchup", label: "Matchup", num: true, title: "Opponent's rank against this position and stat. 1st = gives up the most",
    cell: (r) => (r.matchupRank === null ? "n/a" : ordinal(r.matchupRank)),
    tone: (r) => (r.matchupRank === null ? "" : r.matchupRank <= 3 ? "rank-soft" : r.matchupRank >= r.teamCount - 2 ? "rank-hard" : ""),
  },
  { key: "avg", label: "L10 avg", num: true, hideSm: true, cell: (r) => <span className="mono">{num(r.l10Avg)}</span> },
  { ...BEST, hideSm: true },
  { ...EV, hideSm: true },
];
const ODDS_COLS: Col[] = [
  { key: "fair", label: "Fair", num: true, title: "No-vig consensus probability of this side", cell: (r) => <span className="mono">{prob(r.fair)}</span> },
  BEST,
  EV,
];

export function PropsTable({ rows, sort, dir, path, query, caption, empty }: { rows: PropRow[]; sort: SortKey; dir: "asc" | "desc"; path: string; query: Record<string, string>; caption: string; empty?: string }) {
  if (rows.length === 0) {
    return (
      <div className="card" role="status">
        <h3>No props match</h3>
        <p className="muted sm">{empty ?? "Try another market, clear the search, or lower the minimum rating."}</p>
        <Link className="btn btn-secondary btn-sm" href={{ pathname: path, query: query.sport ? { sport: query.sport } : {} }}>Clear filters</Link>
      </div>
    );
  }
  const stats = rows.some((r) => r.hasStats);
  const cols = stats ? STATS_COLS : ODDS_COLS;
  const head: { key: SortKey; label: string; num?: boolean; hideSm?: boolean; title?: string }[] = [{ key: "player", label: "Player" }, { key: "line", label: "Line", num: true }, ...cols];
  const href = (key: SortKey) => {
    const nextDir = sort === key ? (dir === "asc" ? "desc" : "asc") : key === "player" ? "asc" : "desc";
    return { pathname: path, query: { ...query, sort: key, dir: nextDir } };
  };
  return (
    <div className="table-wrap">
      <table>
        <caption className="vh">{caption}</caption>
        <thead>
          <tr>
            {head.map((c) => (
              <th key={c.key} scope="col" className={`${c.num ? "num" : ""} ${c.hideSm ? "hide-sm" : ""}`} title={c.title} aria-sort={sort === c.key ? (dir === "asc" ? "ascending" : "descending") : undefined}>
                <Link href={href(c.key)}>{c.label}</Link>
              </th>
            ))}
            {!stats && <th scope="col" className="num hide-sm">Books</th>}
            <th scope="col"><span className="vh">Save</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="player-cell">
                <Link href={{ pathname: `/player/${r.player.id}`, query: { market: r.market.key } }}>{r.player.name}</Link>
                <div className="xs muted">
                  {r.gameLabel}{r.player.position ? ` · ${r.player.position}` : ""} · {r.market.label}
                </div>
              </td>
              <td className="num">
                <div className="mono">{r.line}</div>
                <SideTag side={r.side} />
              </td>
              {cols.map((c) => (
                <td key={c.key} className={`num ${c.hideSm ? "hide-sm" : ""} ${c.tone?.(r) ?? ""}`}>{c.cell(r)}</td>
              ))}
              {!stats && <td className="num mono hide-sm">{r.bookCount}</td>}
              <td>
                {r.side && (
                  <SaveButton prop={{ id: r.id, playerId: r.player.id, player: r.player.name, game: r.gameLabel, market: r.market.key, marketLabel: r.market.label, side: r.side, line: r.line, score: r.score, sport: r.sport, savedAt: "" }} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
