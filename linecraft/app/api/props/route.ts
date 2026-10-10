import { NextResponse } from "next/server";
import { board, isSport, SORTS, type SortKey } from "@/lib/data.ts";
import { currentPlan } from "@/lib/plan.ts";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const sport = u.searchParams.get("sport");
  if (!isSport(sport)) return NextResponse.json({ error: "sport must be one of nba, nfl, mlb, nhl" }, { status: 400 });
  const sortRaw = u.searchParams.get("sort") ?? "score";
  const sort = (SORTS as readonly string[]).includes(sortRaw) ? (sortRaw as SortKey) : "score";
  const plan = await currentPlan();
  const { rows, total, locked } = board({ sport, market: u.searchParams.get("market") ?? undefined, q: u.searchParams.get("q")?.slice(0, 60) ?? undefined, sort, plan });
  return NextResponse.json({
    total,
    locked,
    props: rows.map((r) => ({
      id: r.id, player: r.player.name, playerId: r.player.id, team: r.team.abbr, opponent: r.opp.abbr, market: r.market.key,
      line: r.line, locked: r.locked, side: r.side, rating: r.score, l5: r.l5?.rate ?? null, l10: r.l10?.rate ?? null,
      l20: r.l20?.rate ?? null, season: r.season?.rate ?? null, matchupRank: r.matchupRank, bestOdds: r.bestOdds,
    })),
  });
}
