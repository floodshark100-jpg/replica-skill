import type { Metadata } from "next";
import Link from "next/link";
import { arbs, arbQuery, lookAheadHours, mode, quoteAge, scanSettings, splitStake, sport as getSport, type Opportunity } from "@/lib/data.ts";
import { odds, evPct } from "@/lib/format.ts";
import { currentPlan } from "@/lib/plan.ts";
import { SportTabs } from "@/components/SportTabs.tsx";
import { AutoRefresh } from "@/components/AutoRefresh.tsx";

export const metadata: Metadata = { title: "Arbs" };

// A quote this old next to a fresh one is the usual reason an arb exists: the stale book hasn't moved yet.
const STALE_SECONDS = 120;

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const clock = (iso: string) => `${new Date(iso).toISOString().slice(11, 19)} UTC`;
const money = (x: number) => `$${x.toFixed(2)}`;
const age = (s: number | null) => (s === null ? null : s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`);

function Leg({ side, q, now }: { side: "Over" | "Under"; q: Opportunity["over"]; now: Date }) {
  const a = quoteAge(q, now);
  return (
    <>
      <span className="mono">{side} {q.line} <strong>{odds(q.price)}</strong></span>
      <span className="xs muted" style={{ display: "block" }}>
        {q.book}
        {a !== null && <> · <span className={a > STALE_SECONDS ? "rank-hard" : undefined} title="Time since this book last moved the market">{age(a)} old</span></>}
      </span>
    </>
  );
}

export default async function ArbsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const plan = await currentPlan();
  const q = arbQuery((k) => one(sp[k]), plan);
  const s = getSport(q.sport);
  const live = mode() === "live";
  const settings = scanSettings();
  const r = await arbs(q);
  const now = new Date();
  const open = r.rows.filter((x) => !x.locked);
  const lockedGames = [...new Set(r.rows.filter((x) => x.locked).map((x) => x.gameLabel))];

  const query: Record<string, string> = { sport: q.sport };
  if (q.kind) query.kind = q.kind;
  if (q.minMargin !== 0) query.min = String(q.minMargin * 100);
  if (q.stake !== 100) query.stake = String(q.stake);

  return (
    <>
      <h1>Arbitrage scanner</h1>
      <p className="muted sm">
        {s.name}: {r.total} found across {r.games} {r.games === 1 ? "game" : "games"}{live ? ` (${r.inPlay} in play)` : ""}.{" "}
        {live && r.fetchedAt && r.nextAt
          ? <>Prices checked at <time dateTime={r.fetchedAt}>{clock(r.fetchedAt)}</time>; next check after <time dateTime={r.nextAt}>{clock(r.nextAt)}</time>.{r.remaining !== null && ` ${r.remaining} API credits left.`}</>
          : "Demo prices from fictional books."}
      </p>
      <div className="toolbar"><SportTabs active={q.sport} base="/arbs" extra={{ ...query, sport: q.sport }} /></div>
      <div className="chips" aria-label="Kind">
        <Link className="chip" aria-current={!q.kind ? "true" : undefined} href={{ pathname: "/arbs", query: { ...query, kind: undefined } }}>All</Link>
        <Link className="chip" aria-current={q.kind === "arb" ? "true" : undefined} href={{ pathname: "/arbs", query: { ...query, kind: "arb" } }}>Arbs</Link>
        <Link className="chip" aria-current={q.kind === "middle" ? "true" : undefined} href={{ pathname: "/arbs", query: { ...query, kind: "middle" } }}>Middles</Link>
      </div>
      <form className="toolbar" action="/arbs">
        <input type="hidden" name="sport" value={q.sport} />
        {q.kind && <input type="hidden" name="kind" value={q.kind} />}
        <label className="field">Minimum arb margin
          <select className="select" name="min" defaultValue={String(q.minMargin * 100)}>
            <option value="0">Any profit</option><option value="1">1%+</option><option value="2">2%+</option><option value="-1">Near-arbs (from -1%)</option>
          </select>
        </label>
        <label className="field">Total stake ($)<input className="input" type="number" name="stake" min={1} max={100000} step={1} defaultValue={q.stake} style={{ width: 120 }} /></label>
        <button className="btn btn-secondary" type="submit">Apply</button>
        {live && settings && <AutoRefresh seconds={settings.seconds} />}
      </form>

      {r.error ? (
        <div className="banner" role="alert"><span>Live odds are unavailable right now. {r.error}</span></div>
      ) : open.length === 0 ? (
        <div className="card" role="status">
          <h3>{r.games === 0 ? "No games to scan" : "Nothing found right now"}</h3>
          <p className="muted sm" style={{ margin: 0 }}>
            {r.games === 0
              ? `No ${s.name.toLowerCase()} games in play or coming up${settings ? ` in the next ${lookAheadHours()} hours` : ""}. Try another sport.`
              : r.locked > 0
                ? "Everything found is in games on the Pro plan."
                : "No two books disagree enough on any prop. Gaps open and close quickly, especially in play, so check again soon."}
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="arb-table">
            <caption className="vh">{s.name} arbs and middles, best margin first, with stakes for {money(q.stake)}</caption>
            <thead>
              <tr>
                <th scope="col">Prop</th>
                <th scope="col">Over</th>
                <th scope="col">Under</th>
                <th scope="col" className="num" title="Return on the total stake when one side wins">Margin</th>
                <th scope="col" className="num">Stakes on {money(q.stake)}</th>
              </tr>
            </thead>
            <tbody>
              {open.map((row) => {
                const o = row.opp!;
                const st = splitStake(o, q.stake);
                return (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/player/${row.player.id}?market=${row.market.key}`}><strong>{row.player.name}</strong></Link>
                      <span className="xs muted" style={{ display: "block" }}>
                        {row.kind === "arb" ? "Arb" : "Middle"} · {row.market.label} · {row.gameLabel}{row.inPlay && <> · <span className="side over">In play</span></>}
                      </span>
                    </td>
                    <td><Leg side="Over" q={o.over} now={now} /></td>
                    <td><Leg side="Under" q={o.under} now={now} /></td>
                    <td className="num mono" data-label="Margin">
                      <span className={o.margin > 0 ? "rank-soft" : undefined}>{evPct(o.margin)}</span>
                      {o.bothWin !== null && <span className="xs muted" style={{ display: "block" }}>both win {evPct(o.bothWin)}</span>}
                    </td>
                    <td className="num mono" data-label={`Stakes on ${money(q.stake)}`}>
                      {money(st.over)} / {money(st.under)}
                      <span className="xs muted" style={{ display: "block" }}>pays {money(q.stake / o.overround)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {r.locked > 0 && (
        <section className="banner" aria-labelledby="arb-locked-h">
          <div>
            <h2 id="arb-locked-h" style={{ margin: 0, fontSize: "var(--fs-base)" }}>🔒 {r.locked} more in {lockedGames.length} {lockedGames.length === 1 ? "game" : "games"} on Pro</h2>
            <p className="xs muted" style={{ margin: 0 }}>{lockedGames.join(" · ")}</p>
          </div>
          <span className="spacer" />
          <Link className="btn btn-primary btn-sm" href="/pricing">Unlock every game</Link>
        </section>
      )}

      <div className="card" role="note" style={{ marginTop: "var(--s4)" }}>
        <h3>Before you stake</h3>
        <p className="muted sm" style={{ margin: 0 }}>
          An arb pays the same whichever side wins; a middle wins both bets if the result lands between the lines and costs a little if it doesn&apos;t.
          Confirm both prices at the books first: in-play prices move in seconds, a quote that&apos;s minutes old is often about to move, books can void
          obvious pricing errors, and they limit accounts that arb. Research only.
        </p>
      </div>
    </>
  );
}
