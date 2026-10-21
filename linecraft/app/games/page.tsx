import type { Metadata } from "next";
import Link from "next/link";
import { gameCards, isSport, sport as getSport } from "@/lib/data.ts";
import { currentPlan } from "@/lib/plan.ts";
import { SportTabs } from "@/components/SportTabs.tsx";

export const metadata: Metadata = { title: "Games" };

export default async function GamesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.sport) ? sp.sport[0] : sp.sport;
  const sportKey = isSport(raw) ? raw : "nba";
  const plan = await currentPlan();
  const { cards, error } = await gameCards(sportKey, plan);
  return (
    <>
      <h1>Games</h1>
      <p className="muted sm">{getSport(sportKey).name}: {cards.length} upcoming games. Times in UTC.</p>
      <div className="toolbar"><SportTabs active={sportKey} base="/games" /></div>
      {error ? (
        <div className="banner" role="alert"><span>Live odds are unavailable right now. {error}</span></div>
      ) : cards.length === 0 ? (
        <div className="card" role="status"><h3>No games scheduled</h3><p className="muted sm">Nothing on the slate for this sport. Check another one.</p></div>
      ) : (
        <div className="grid grid-3">
          {cards.map(({ game: g, home, away, props, unlocked }) => (
            <Link key={g.id} href={`/games/${g.id}`} className="card game">
              <span className="xs muted"><time dateTime={g.startAt}>{new Date(g.startAt).toUTCString().slice(0, 22)} UTC</time> · {props} props {unlocked ? "" : "· 🔒 Pro"}</span>
              <span className="teams"><span>{away.city} {away.name}</span><span className="muted xs">at</span><span>{home.city} {home.name}</span></span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
