import { NextResponse } from "next/server";
import { board, isSport, mode, SORTS, type SortKey } from "@/lib/data.ts";
import { currentPlan } from "@/lib/plan.ts";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const sport = u.searchParams.get("sport");
  if (!isSport(sport)) return NextResponse.json({ error: "sport must be one of nba, nfl, mlb, nhl" }, { status: 400 });
  const fallback: SortKey = mode() === "live" ? "ev" : "score";
  const sortRaw = u.searchParams.get("sort") ?? fallback;
  const sort = (SORTS as readonly string[]).includes(sortRaw) ? (sortRaw as SortKey) : fallback;
  const plan = await currentPlan();
  const { rows, total, locked, error } = await board({ sport, market: u.searchParams.get("market") ?? undefined, q: u.searchParams.get("q")?.slice(0, 60) ?? undefined, sort, plan });
  if (error) return NextResponse.json({ error }, { status: 502 });
  return NextResponse.json({
    source: mode(),
    total,
    locked,
    props: rows.map((r) => ({
      id: r.id, player: r.player.name, playerId: r.player.id, game: r.gameLabel, team: r.team?.abbr ?? null, opponent: r.opp?.abbr ?? null, market: r.market.key,
      line: r.line, locked: r.locked, side: r.side, rating: r.score, l5: r.l5?.rate ?? null, l10: r.l10?.rate ?? null,
      l20: r.l20?.rate ?? null, season: r.season?.rate ?? null, matchupRank: r.matchupRank, bestOdds: r.bestOdds, fair: r.fair, ev: r.ev, books: r.bookCount, startAt: r.startAt,
    })),
  });
}
