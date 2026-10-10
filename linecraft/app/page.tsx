import Link from "next/link";
import { board } from "@/lib/data.ts";
import { RatingBadge, SideTag, Hit } from "@/components/Stat.tsx";

export default function Home() {
  const top = board({ sport: "nba", plan: "free", sort: "score" }).rows.filter((r) => !r.locked).slice(0, 3);
  return (
    <>
      <section className="hero">
        <h1>Find the prop worth betting before the line moves.</h1>
        <p>
          Every player prop today across four sports, scored 0 to 100 with a rating that shows its working. Hit rates, matchups and
          prices from every book on one fast page.
        </p>
        <div className="row">
          <Link className="btn btn-primary btn-lg" href="/props">Open today&apos;s props</Link>
          <Link className="btn btn-secondary btn-lg" href="/pricing">See pricing</Link>
        </div>
      </section>

      <section aria-labelledby="top-h">
        <h2 id="top-h">Top rated right now</h2>
        <div className="grid grid-3">
          {top.map((r) => (
            <Link key={r.id} href={`/player/${r.player.id}?market=${r.market.key}`} className="card game">
              <div className="row"><RatingBadge score={r.score} /><SideTag side={r.side} /> <span className="mono">{r.line}</span> <span className="muted sm">{r.market.label}</span></div>
              <strong>{r.player.name}</strong>
              <span className="xs muted">{r.team.abbr} {r.home ? "vs" : "@"} {r.opp.abbr} · L10 <Hit r={r.l10} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="how-h">
        <h2 id="how-h">How it works</h2>
        <ol className="steps" style={{ padding: 0 }}>
          <li className="card"><h3>Scan the board</h3><p className="muted sm">Pick a sport and a stat. Sort by rating, hit rate or matchup.</p></li>
          <li className="card"><h3>Open the prop</h3><p className="muted sm">Every game against the line, home and away, the opponent, and how the rating was built.</p></li>
          <li className="card"><h3>Take the best price</h3><p className="muted sm">See each book&apos;s line and odds side by side, then save the prop to your shortlist.</p></li>
        </ol>
      </section>

      <section aria-labelledby="why-h">
        <h2 id="why-h">Built differently</h2>
        <div className="grid grid-3">
          <div className="card"><h3>A rating with no black box</h3><p className="muted sm">Five inputs, fixed weights, all shown on every prop. You can disagree with it, and see exactly where.</p></div>
          <div className="card"><h3>Fast on a bad connection</h3><p className="muted sm">The board is rendered on the server and sorted by links, so it works before any script loads.</p></div>
          <div className="card"><h3>Any phone, any browser</h3><p className="muted sm">No app store needed. Android, iPhone or laptop, same tool.</p></div>
        </div>
      </section>
    </>
  );
}
