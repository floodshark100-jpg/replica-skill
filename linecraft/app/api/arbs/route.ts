import { NextResponse } from "next/server";
import { arbs, arbQuery, isSport, mode, splitStake } from "@/lib/data.ts";
import { currentPlan } from "@/lib/plan.ts";

// GET /api/arbs?sport=nhl[&kind=arb|middle][&min=0][&cost=3][&stake=100]
// min and cost are percentages. Prices of locked games are never sent.
export async function GET(req: Request) {
  const u = new URL(req.url);
  if (!isSport(u.searchParams.get("sport"))) return NextResponse.json({ error: "sport must be one of nba, nfl, mlb, nhl" }, { status: 400 });
  const q = arbQuery((k) => u.searchParams.get(k), await currentPlan());
  const r = await arbs(q);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json({
    source: mode(),
    fetchedAt: r.fetchedAt,
    nextAt: r.nextAt,
    creditsRemaining: r.remaining,
    games: r.games,
    inPlay: r.inPlay,
    total: r.total,
    locked: r.locked,
    stake: q.stake,
    opportunities: r.rows.map((row) => ({
      id: row.id, kind: row.kind, player: row.player.name, playerId: row.player.id, market: row.market.key, game: row.gameLabel, startAt: row.startAt,
      inPlay: row.inPlay, locked: row.locked,
      ...(row.opp && {
        over: row.opp.over, under: row.opp.under, margin: row.opp.margin, bothWin: row.opp.bothWin, stakes: splitStake(row.opp, q.stake),
        payout: Math.round((q.stake / row.opp.overround) * 100) / 100,
      }),
    })),
  });
}
