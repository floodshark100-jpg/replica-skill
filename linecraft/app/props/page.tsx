import type { Metadata } from "next";
import Link from "next/link";
import { board, isSport, lookAheadHours, mode, sport as getSport, SORTS, type SortKey } from "@/lib/data.ts";
import { currentPlan } from "@/lib/plan.ts";
import { SportTabs } from "@/components/SportTabs.tsx";
import { PropsTable } from "@/components/PropsTable.tsx";

export const metadata: Metadata = { title: "Props" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PropsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const plan = await currentPlan();
  const sportKey = isSport(one(sp.sport)) ? (one(sp.sport) as "nba") : "nba";
  const s = getSport(sportKey);
  const marketKey = s.markets.some((m) => m.key === one(sp.market)) ? one(sp.market) : undefined;
  const live = mode() === "live";
  const sort = (SORTS as readonly string[]).includes(one(sp.sort) ?? "") ? (one(sp.sort) as SortKey) : live ? "ev" : "score";
  const dir = one(sp.dir) === "asc" ? "asc" : one(sp.dir) === "desc" ? "desc" : sort === "player" ? "asc" : "desc";
  const q = (one(sp.q) ?? "").slice(0, 60);
  const min = Number(one(sp.min) ?? 0);
  const minScore = Number.isFinite(min) && min > 0 ? Math.min(min, 100) : 0;
  const side = one(sp.side) === "over" || one(sp.side) === "under" ? (one(sp.side) as "over") : undefined;
  const opp = one(sp.opp)?.slice(0, 4);

  const { rows, total, locked, games, error } = await board({ sport: sportKey, market: marketKey, q, opp, minScore, side, sort, dir, plan });

  const open = rows.filter((r) => !r.locked);
  // an unfiltered live board that's empty: either no games in the window, or books haven't posted props yet
  const liveEmpty = live && total === 0 && !q && !marketKey && !side && !opp
    ? games === 0
      ? `No ${s.name.toLowerCase()} games in the next ${lookAheadHours()} hours. Try another sport.`
      : "No player props are posted for this sport yet. Books usually post them the day of the game."
    : undefined;
  const lockedGames = [...new Map(rows.filter((r) => r.locked).map((r) => [r.gameId, r.gameLabel])).values()];

  const query: Record<string, string> = { sport: sportKey };
  if (marketKey) query.market = marketKey;
  if (q) query.q = q;
  if (minScore) query.min = String(minScore);
  if (side) query.side = side;
  if (opp) query.opp = opp;

  return (
    <>
      <h1>Props today</h1>
      <p className="muted sm">
        {s.name}: {total} props{locked ? `, ${total - locked} open on the free plan` : ""}.{" "}
        {live ? "Live lines and prices. Each prop shows the side with the better expected value against the no-vig consensus." : "Hit rates are for the side the numbers favour."}
      </p>
      <div className="toolbar">
        <SportTabs active={sportKey} base="/props" />
      </div>
      <div className="chips" aria-label="Market">
        <Link className="chip" aria-current={!marketKey ? "true" : undefined} href={{ pathname: "/props", query: { ...query, market: undefined } }}>All</Link>
        {s.markets.map((m) => (
          <Link key={m.key} className="chip" aria-current={marketKey === m.key ? "true" : undefined} href={{ pathname: "/props", query: { ...query, market: m.key } }}>{m.label}</Link>
        ))}
      </div>
      <form className="toolbar" action="/props" role="search">
        <input type="hidden" name="sport" value={sportKey} />
        {marketKey && <input type="hidden" name="market" value={marketKey} />}
        {opp && <input type="hidden" name="opp" value={opp} />}
        <label className="field">Player or team<input className="input" type="search" name="q" defaultValue={q} placeholder="Search" /></label>
        {!live && <label className="field">Minimum rating
          <select className="select" name="min" defaultValue={String(minScore)}>
            <option value="0">Any</option><option value="60">60+</option><option value="70">70+</option><option value="80">80+</option>
          </select>
        </label>}
        <label className="field">Side
          <select className="select" name="side" defaultValue={side ?? ""}>
            <option value="">Both</option><option value="over">Over</option><option value="under">Under</option>
          </select>
        </label>
        <button className="btn btn-secondary" type="submit">Apply</button>
        {opp && <Link className="btn btn-ghost" href={{ pathname: "/props", query: { ...query, opp: undefined } }}>Opponent: {opp} ✕</Link>}
      </form>
      {error && (
        <div className="banner" role="alert"><span>Live odds are unavailable right now. {error}</span></div>
      )}
      {!error && <PropsTable rows={open} sort={sort} dir={dir} path="/props" query={query} caption={`${s.name} player props, sorted by ${sort}`} empty={locked > 0 ? "Nothing open matches on the free plan." : liveEmpty} />}
      {locked > 0 && (
        <section className="banner" aria-labelledby="locked-h">
          <div>
            <h2 id="locked-h" style={{ margin: 0, fontSize: "var(--fs-base)" }}>🔒 {locked} more {locked === 1 ? "prop" : "props"} in {lockedGames.length} {lockedGames.length === 1 ? "game" : "games"} on Pro</h2>
            <p className="xs muted" style={{ margin: 0 }}>
              {lockedGames.join(" · ")}
            </p>
          </div>
          <span className="spacer" />
          <Link className="btn btn-primary btn-sm" href="/pricing">Unlock every game</Link>
        </section>
      )}
    </>
  );
}
