import type { Metadata } from "next";
import Link from "next/link";
import { games, isSport, sport as getSport, team, propCount, isUnlocked } from "@/lib/data.ts";
import { currentPlan } from "@/lib/plan.ts";
import { SportTabs } from "@/components/SportTabs.tsx";

export const metadata: Metadata = { title: "Games" };

export default async function GamesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.sport) ? sp.sport[0] : sp.sport;
  const sportKey = isSport(raw) ? raw : "nba";
  const plan = await currentPlan();
  const list = games(sportKey);
  return (
    <>
      <h1>Games today</h1>
      <p className="muted sm">{getSport(sportKey).name}: {list.length} games. Times in UTC.</p>
      <div className="toolbar"><SportTabs active={sportKey} base="/games" /></div>
      {list.length === 0 ? (
        <div className="card" role="status"><h3>No games today</h3><p className="muted sm">Check another sport.</p></div>
      ) : (
        <div className="grid grid-3">
          {list.map((g) => {
            const home = team(g.homeId);
            const away = team(g.awayId);
            const open = isUnlocked(g, plan);
            return (
              <Link key={g.id} href={`/games/${g.id}`} className="card game">
                <span className="xs muted"><time dateTime={g.startAt}>{new Date(g.startAt).toUTCString().slice(17, 22)} UTC</time> · {propCount(g.id)} props {open ? "" : "· 🔒 Pro"}</span>
                <span className="teams"><span>{away.city} {away.name}</span><span className="muted xs">at</span><span>{home.city} {home.name}</span></span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
