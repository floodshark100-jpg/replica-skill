import type { LiveDetail } from "@/lib/data.ts";
import { evPct, odds, prob } from "@/lib/format.ts";
import { SideTag } from "./Stat.tsx";
import { SaveButton } from "./SaveButton.tsx";

// The player page when the source is an odds feed: prices, fair value and EV, no game log.
export function LiveOdds({ d }: { d: LiveDetail }) {
  const { row } = d;
  const main = d.lines[0];
  const side = row.side!;
  const bookAt = (best: number | null, key: "over" | "under") => main.books.filter((b) => b[key] === best).map((b) => b.book).join(", ");
  return (
    <>
      <section className="card" style={{ marginTop: "var(--s4)" }} aria-labelledby="line-h">
        <div className="row">
          <h2 id="line-h" style={{ margin: 0 }}><SideTag side={side} /> <span className="mono">{row.line}</span> {row.market.label}</h2>
          <span className="spacer" />
          <SaveButton size="md" prop={{ id: row.id, playerId: row.player.id, player: row.player.name, game: row.gameLabel, market: row.market.key, marketLabel: row.market.label, side, line: row.line, score: null, sport: row.sport, savedAt: "" }} />
        </div>
        <div className="tiles" style={{ marginTop: "var(--s4)" }}>
          <div className="tile"><div className="xs muted">Fair over</div><div className="big mono">{prob(main.price.fair?.over ?? null)}</div></div>
          <div className="tile"><div className="xs muted">Fair under</div><div className="big mono">{prob(main.price.fair?.under ?? null)}</div></div>
          <div className="tile"><div className="xs muted">Best over · {bookAt(main.price.best.over, "over")}</div><div className="big mono">{odds(main.price.best.over)}</div></div>
          <div className="tile"><div className="xs muted">Best under · {bookAt(main.price.best.under, "under")}</div><div className="big mono">{odds(main.price.best.under)}</div></div>
          <div className="tile"><div className="xs muted">EV over</div><div className={`big mono ${(main.price.ev.over ?? 0) > 0 ? "rank-soft" : ""}`}>{evPct(main.price.ev.over)}</div></div>
          <div className="tile"><div className="xs muted">EV under</div><div className={`big mono ${(main.price.ev.under ?? 0) > 0 ? "rank-soft" : ""}`}>{evPct(main.price.ev.under)}</div></div>
        </div>
        <p className="xs muted" style={{ marginBottom: 0 }}>
          Fair is the average no-vig probability across the {main.books.length} {main.books.length === 1 ? "book" : "books"} quoting {row.line}.
          EV is the expected return per unit at the best price if fair is right.
        </p>
      </section>

      {d.lines.map((l, i) => (
        <section key={l.line} aria-labelledby={`l-${i}`}>
          <h2 id={`l-${i}`}>{i === 0 ? `Prices at ${l.line}` : `Alt line ${l.line}`} <span className="muted sm">· fair over {prob(l.price.fair?.over ?? null)}</span></h2>
          <div className="table-wrap">
            <table>
              <caption className="vh">Over and under prices at {l.line} by sportsbook</caption>
              <thead><tr><th scope="col">Book</th><th scope="col" className="num">Over</th><th scope="col" className="num">Under</th></tr></thead>
              <tbody>
                {[...l.books].sort((a, b) => a.book.localeCompare(b.book)).map((b) => (
                  <tr key={b.book}>
                    <td>{b.book}</td>
                    <td className={`num mono ${b.over === l.price.best.over ? "rank-soft" : ""}`}>{odds(b.over)}{b.over === l.price.best.over && <span className="vh"> (best)</span>}</td>
                    <td className={`num mono ${b.under === l.price.best.under ? "rank-soft" : ""}`}>{odds(b.under)}{b.under === l.price.best.under && <span className="vh"> (best)</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className="xs muted">Best price in green.</p>

      <div className="card" role="note" style={{ marginTop: "var(--s4)" }}>
        <h3>Hit rates and the rating need game logs</h3>
        <p className="muted sm" style={{ margin: 0 }}>
          The odds feed gives lines and prices. Connect a stats provider to add each player&apos;s game log, hit rates, matchup rank and the 0-100 rating.
        </p>
      </div>
    </>
  );
}
