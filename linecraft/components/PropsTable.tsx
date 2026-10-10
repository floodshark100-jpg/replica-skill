import Link from "next/link";
import type { PropRow, SortKey } from "@/lib/data.ts";
import { num, odds, ordinal } from "@/lib/format.ts";
import { Hit, RatingBadge, SideTag } from "./Stat.tsx";
import { SaveButton } from "./SaveButton.tsx";

const COLS: { key: SortKey; label: string; num?: boolean; hideSm?: boolean; title?: string }[] = [
  { key: "player", label: "Player" },
  { key: "line", label: "Line", num: true },
  { key: "score", label: "Rating", num: true, title: "Linecraft rating, 0-100" },
  { key: "l5", label: "L5", num: true, title: "Hit rate, last 5 games" },
  { key: "l10", label: "L10", num: true, title: "Hit rate, last 10 games" },
  { key: "l20", label: "L20", num: true, hideSm: true, title: "Hit rate, last 20 games" },
  { key: "season", label: "Season", num: true, hideSm: true },
  { key: "h2h", label: "H2H", num: true, hideSm: true, title: "Hit rate against today's opponent" },
  { key: "matchup", label: "Matchup", num: true, title: "Opponent's rank against this position and stat. 1st = gives up the most" },
  { key: "avg", label: "L10 avg", num: true, hideSm: true },
  { key: "odds", label: "Best odds", num: true, hideSm: true },
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
            {COLS.map((c) => (
              <th key={c.key} scope="col" className={`${c.num ? "num" : ""} ${c.hideSm ? "hide-sm" : ""}`} title={c.title} aria-sort={sort === c.key ? (dir === "asc" ? "ascending" : "descending") : undefined}>
                <Link href={href(c.key)}>{c.label}</Link>
              </th>
            ))}
            <th scope="col"><span className="vh">Save</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="player-cell">
                <Link href={{ pathname: `/player/${r.player.id}`, query: { market: r.market.key } }}>{r.player.name}</Link>
                <div className="xs muted">
                  {r.team.abbr} {r.home ? "vs" : "@"} {r.opp.abbr} · {r.player.position} · {r.market.label}
                </div>
              </td>
              <td className="num">
                <div className="mono">{r.line}</div>
                <SideTag side={r.side} />
              </td>
              <td className="num"><RatingBadge score={r.score} /></td>
              <td className="num"><Hit r={r.l5} /></td>
              <td className="num"><Hit r={r.l10} /></td>
              <td className="num hide-sm"><Hit r={r.l20} /></td>
              <td className="num hide-sm"><Hit r={r.season} /></td>
              <td className="num hide-sm"><Hit r={r.h2h} showCount /></td>
              <td className={`num ${r.matchupRank! <= 3 ? "rank-soft" : r.matchupRank! >= r.teamCount - 2 ? "rank-hard" : ""}`}>
                {ordinal(r.matchupRank!)}
              </td>
              <td className="num mono hide-sm">{num(r.l10Avg)}</td>
              <td className="num mono hide-sm">{odds(r.bestOdds)}</td>
              <td>
                {r.side && (
                  <SaveButton prop={{ id: r.id, playerId: r.player.id, player: r.player.name, team: r.team.abbr, opp: r.opp.abbr, market: r.market.key, marketLabel: r.market.label, side: r.side, line: r.line, score: r.score, sport: r.sport, savedAt: "" }} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
