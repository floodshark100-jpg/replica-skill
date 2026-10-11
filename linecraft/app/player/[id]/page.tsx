import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { propDetail, playerName } from "@/lib/data.ts";
import { currentPlan } from "@/lib/plan.ts";
import { last } from "@/lib/stats.ts";
import { evPct, num, odds, ordinal, pct, prob } from "@/lib/format.ts";
import { GameLogChart } from "@/components/GameLogChart.tsx";
import { Hit, RatingBadge, SideTag } from "@/components/Stat.tsx";
import { SaveButton } from "@/components/SaveButton.tsx";
import { LiveOdds } from "@/components/LiveOdds.tsx";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const WINDOWS = [5, 10, 20] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = await playerName((await params).id);
  return { title: name ?? "Player not found" };
}

export default async function PlayerPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const plan = await currentPlan();
  const d = await propDetail(id, one(sp.market), plan);
  if (!d) notFound();
  const w = Number(one(sp.window));
  const win = (WINDOWS as readonly number[]).includes(w) ? w : 10;
  const { row, markets } = d;
  const p = row.player;

  const header = (
    <>
      <p className="xs muted"><Link href={`/props?sport=${row.sport}`}>Props</Link>{row.team ? ` / ${row.team.city} ${row.team.name}` : ""}</p>
      <h1>{p.name}</h1>
      <p className="muted sm">{p.position ? `${p.position} · ` : ""}{row.gameLabel} · <time dateTime={row.startAt}>{new Date(row.startAt).toUTCString().slice(0, 22)} UTC</time> · <Link href={`/games/${row.gameId}`}>Game</Link></p>
      <div className="chips" aria-label="Market">
        {markets.map((m) => (
          <Link key={m.key} className="chip" aria-current={m.key === row.market.key ? "true" : undefined} href={{ pathname: `/player/${p.id}`, query: { market: m.key, window: String(win) } }}>{m.label}</Link>
        ))}
      </div>
    </>
  );

  if (d.kind === "locked") {
    return (
      <>
        {header}
        <div className="card" style={{ marginTop: "var(--s5)" }} role="status">
          <h2>🔒 This game is on Pro</h2>
          <p className="muted">The free plan opens the first game of the day in each sport. Pro opens every game, every prop.</p>
          <Link className="btn btn-primary" href="/pricing">See Pro</Link>
        </div>
      </>
    );
  }

  if (d.kind === "live") {
    return (
      <>
        {header}
        <LiveOdds d={d} />
      </>
    );
  }

  const shown = last(d.log, win);
  const side = row.side!;
  return (
    <>
      {header}
      <section className="card" style={{ marginTop: "var(--s4)" }} aria-labelledby="line-h">
        <div className="row">
          <RatingBadge score={row.score} />
          <h2 id="line-h" style={{ margin: 0 }}><SideTag side={side} /> <span className="mono">{row.line}</span> {row.market.label}</h2>
          <span className="spacer" />
          <SaveButton size="md" prop={{ id: row.id, playerId: p.id, player: p.name, game: row.gameLabel, market: row.market.key, marketLabel: row.market.label, side, line: row.line, score: row.score, sport: row.sport, savedAt: "" }} />
        </div>
        <div className="tiles" style={{ marginTop: "var(--s4)" }}>
          <div className="tile"><div className="xs muted">Last 5</div><div className="big"><Hit r={row.l5} showCount /></div></div>
          <div className="tile"><div className="xs muted">Last 10</div><div className="big"><Hit r={row.l10} showCount /></div></div>
          <div className="tile"><div className="xs muted">Last 20</div><div className="big"><Hit r={row.l20} showCount /></div></div>
          <div className="tile"><div className="xs muted">Season</div><div className="big"><Hit r={row.season} showCount /></div></div>
          <div className="tile"><div className="xs muted">vs {row.opp!.abbr}</div><div className="big"><Hit r={row.h2h} showCount /></div></div>
          <div className="tile"><div className="xs muted">L10 average</div><div className="big mono">{num(row.l10Avg)}</div></div>
          <div className="tile"><div className="xs muted">Market fair, {side}</div><div className="big mono">{prob(row.fair)}</div></div>
          <div className="tile"><div className="xs muted">EV at {odds(row.bestOdds)}</div><div className="big mono">{evPct(row.ev)}</div></div>
        </div>
      </section>

      <section aria-labelledby="log-h">
        <div className="row">
          <h2 id="log-h">Game log vs {row.line}</h2>
          <span className="spacer" />
          <div className="chips" aria-label="Games shown">
            {WINDOWS.map((n) => (
              <Link key={n} className="chip" aria-current={n === win ? "true" : undefined} href={{ pathname: `/player/${p.id}`, query: { market: row.market.key, window: String(n) } }}>L{n}</Link>
            ))}
          </div>
        </div>
        <div className="card"><GameLogChart log={shown} line={row.line} side={side} label={row.market.label} /></div>
      </section>

      <div className="grid grid-2">
        <section aria-labelledby="rating-h">
          <h2 id="rating-h">How the {row.score} was built</h2>
          <div className="card parts">
            {d.rating.parts.map((part) => (
              <div key={part.key} className="part">
                <span>{part.label} <span className="muted xs">× {Math.round(part.weight * 100)}%</span></span>
                <span className="mono">{Math.round(part.value * 100)}</span>
                <div className="meter" aria-hidden="true"><i style={{ width: `${Math.round(part.value * 100)}%` }} /></div>
              </div>
            ))}
            <p className="xs muted" style={{ margin: 0 }}>
              Each input is scored 0-100 for the {side}, then weighted. Opponent: {row.opp!.abbr} rank {ordinal(row.matchupRank!)} of {row.teamCount} in {row.market.label.toLowerCase()} allowed to {p.position}s
              {d.matchupAllowed !== null ? ` (${d.matchupAllowed} a game)` : ""}.
            </p>
          </div>
        </section>

        <section aria-labelledby="books-h">
          <h2 id="books-h">Prices by book</h2>
          <div className="table-wrap">
            <table>
              <caption className="vh">Line and odds at each sportsbook</caption>
              <thead><tr><th scope="col">Book</th><th scope="col" className="num">Line</th><th scope="col" className="num">Over</th><th scope="col" className="num">Under</th></tr></thead>
              <tbody>
                {d.books.map((b) => (
                  <tr key={b.book}>
                    <td>{b.book}</td>
                    <td className="num mono">{b.line}</td>
                    <td className={`num mono ${b.bestOver ? "rank-soft" : ""}`}>{odds(b.over)}{b.bestOver && <span className="vh"> (best)</span>}</td>
                    <td className={`num mono ${b.bestUnder ? "rank-soft" : ""}`}>{odds(b.under)}{b.bestUnder && <span className="vh"> (best)</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="xs muted">Best price in green.</p>
        </section>

        <section aria-labelledby="split-h">
          <h2 id="split-h">Splits</h2>
          <div className="tiles">
            {d.splits.map((s) => (
              <div key={s.label} className="tile"><div className="xs muted">{s.label} · avg {num(s.avg)}</div><div className="big"><Hit r={s.rate} showCount /></div></div>
            ))}
          </div>
        </section>

        <section aria-labelledby="alt-h">
          <h2 id="alt-h">Alt lines, all games</h2>
          <div className="table-wrap">
            <table>
              <caption className="vh">Hit rate at other lines over the full game log</caption>
              <thead><tr><th scope="col" className="num">Line</th><th scope="col" className="num">Over</th><th scope="col" className="num">Under</th></tr></thead>
              <tbody>
                {d.altLines.map((a) => (
                  <tr key={a.line} aria-current={a.line === row.line ? "true" : undefined}>
                    <td className="num mono">{a.line}{a.line === row.line ? " ●" : ""}</td>
                    <td className="num"><Hit r={a.over} /></td>
                    <td className="num"><Hit r={a.under} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section aria-labelledby="games-h">
        <h2 id="games-h">Every game</h2>
        <div className="table-wrap">
          <table>
            <caption className="vh">Full game log for {row.market.label}</caption>
            <thead><tr><th scope="col">Date</th><th scope="col">Opponent</th><th scope="col" className="num">{row.market.short}</th><th scope="col">Result</th></tr></thead>
            <tbody>
              {d.log.map((g, i) => {
                const res = g.value === row.line ? "Push" : (g.value > row.line) === (side === "over") ? "Hit" : "Miss";
                return (
                  <tr key={i}>
                    <td className="mono">{g.date}</td>
                    <td>{g.home ? "vs" : "@"} {g.opp.abbr}</td>
                    <td className="num mono">{g.value}</td>
                    <td className={res === "Hit" ? "rank-soft" : res === "Miss" ? "rank-hard" : "muted"}>{res}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="xs muted">Season hit rate {pct(row.season)} on the {side}.</p>
      </section>
    </>
  );
}
