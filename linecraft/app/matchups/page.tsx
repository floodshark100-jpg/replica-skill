import type { Metadata } from "next";
import Link from "next/link";
import { isSport, sport as getSport, matchups, positions, team } from "@/lib/data.ts";
import { SportTabs } from "@/components/SportTabs.tsx";
import { ordinal } from "@/lib/format.ts";

export const metadata: Metadata = { title: "Matchups" };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function MatchupsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const sportKey = isSport(one(sp.sport)) ? (one(sp.sport) as "nba") : "nba";
  const s = getSport(sportKey);
  const posList = positions(sportKey);
  const pos = posList.includes(one(sp.position) ?? "") ? one(sp.position)! : posList[0];
  const markets = s.markets.filter((m) => m.positions.includes(pos) && m.key !== "pra");
  const mk = markets.find((m) => m.key === one(sp.market)) ?? markets[0];
  const rows = matchups(sportKey, pos, mk.key);
  return (
    <>
      <h1>Defense vs position</h1>
      <p className="muted sm">What each defense gives up to a position, per game, this season. 1st gives up the most.</p>
      <div className="toolbar"><SportTabs active={sportKey} base="/matchups" /></div>
      <div className="chips" aria-label="Position">
        {posList.map((p) => (
          <Link key={p} className="chip" aria-current={p === pos ? "true" : undefined} href={{ pathname: "/matchups", query: { sport: sportKey, position: p } }}>{p}</Link>
        ))}
      </div>
      <div className="chips" aria-label="Stat" style={{ marginTop: "var(--s3)", marginBottom: "var(--s4)" }}>
        {markets.map((m) => (
          <Link key={m.key} className="chip" aria-current={m.key === mk.key ? "true" : undefined} href={{ pathname: "/matchups", query: { sport: sportKey, position: pos, market: m.key } }}>{m.label}</Link>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <caption className="vh">{mk.label} allowed to {pos} by team</caption>
          <thead><tr><th scope="col" className="num">Rank</th><th scope="col">Defense</th><th scope="col" className="num">Allowed / game</th><th scope="col">Today</th><th scope="col"><span className="vh">Props</span></th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const g = r.games;
              const oppOf = g ? team(g.homeId === r.team.id ? g.awayId : g.homeId) : null;
              return (
                <tr key={r.team.id}>
                  <td className={`num ${r.rank <= 3 ? "rank-soft" : r.rank >= rows.length - 2 ? "rank-hard" : ""}`}>{ordinal(r.rank)}</td>
                  <td>{r.team.city} {r.team.name}</td>
                  <td className="num mono">{r.allowed}</td>
                  <td className="sm">{oppOf ? `vs ${oppOf.abbr}` : <span className="muted">no game</span>}</td>
                  <td>{g && <Link className="btn btn-ghost btn-sm" href={{ pathname: "/props", query: { sport: sportKey, market: mk.key, opp: r.team.abbr } }}>Props vs {r.team.abbr}</Link>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
