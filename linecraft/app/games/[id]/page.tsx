import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { game as getGame, team, board, SORTS, type SortKey } from "@/lib/data.ts";
import { currentPlan } from "@/lib/plan.ts";
import { PropsTable } from "@/components/PropsTable.tsx";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = getGame((await params).id);
  return { title: g ? `${team(g.awayId).abbr} at ${team(g.homeId).abbr}` : "Game not found" };
}

export default async function GamePage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const g = getGame(id);
  if (!g) notFound();
  const plan = await currentPlan();
  const sort = (SORTS as readonly string[]).includes(one(sp.sort) ?? "") ? (one(sp.sort) as SortKey) : "score";
  const dir = one(sp.dir) === "asc" ? "asc" : one(sp.dir) === "desc" ? "desc" : sort === "player" ? "asc" : "desc";
  const { rows, locked } = board({ sport: g.sport, gameId: g.id, sort, dir, plan });
  const home = team(g.homeId);
  const away = team(g.awayId);
  return (
    <>
      <p className="xs muted"><Link href={`/games?sport=${g.sport}`}>Games</Link> / {g.sport.toUpperCase()}</p>
      <h1>{away.city} {away.name} at {home.city} {home.name}</h1>
      <p className="muted sm"><time dateTime={g.startAt}>{new Date(g.startAt).toUTCString().slice(0, 22)} UTC</time> · {rows.length} props</p>
      {locked > 0 ? (
        <div className="card" role="status">
          <h2 style={{ marginTop: 0 }}>🔒 This game is on Pro</h2>
          <p className="muted sm">Free opens the first game of the day in each sport. Players with props here: {[...new Set(rows.map((r) => r.player.name))].join(", ")}.</p>
          <Link className="btn btn-primary btn-sm" href="/pricing">See Pro</Link>
        </div>
      ) : <PropsTable rows={rows} sort={sort} dir={dir} path={`/games/${g.id}`} query={{}} caption={`Props for ${away.abbr} at ${home.abbr}`} />}
    </>
  );
}
