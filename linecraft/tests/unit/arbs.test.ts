// Arbitrage scanner: arb and middle maths, thresholds, stake splits, and the
// "scan" snapshot that includes games in play with its own cache time.
import { test } from "node:test";
import assert from "node:assert/strict";
import { findOpportunities, pairOf, splitStake, quoteAge } from "../../lib/arbs.ts";
import { arbRows } from "../../lib/board.ts";
import { oddsConfig } from "../../lib/odds-api.ts";
import { fetchSnapshot, snapshot, arbs, clearCache } from "../../lib/live.ts";
import { EVENTS, fakeFetch } from "../fixtures/odds-api.ts";
import { SPORTS } from "../../lib/seed.ts";

const b = (book: string, line: number, over: number, under: number, updatedAt?: string) => ({ book, line, over, under, updatedAt });

test("arb: best over and under from different books at one line", () => {
  const [o] = findOpportunities([b("A", 5.5, 120, -150), b("B", 5.5, -160, 130)]);
  assert.equal(o.kind, "arb");
  assert.equal(o.over.book, "A");
  assert.equal(o.under.book, "B");
  // 1/2.2 + 1/2.3 = 0.8893 -> 12.45% whichever side wins
  assert.ok(Math.abs(o.margin - 0.1245) < 0.0005);
  assert.ok(Math.abs(o.stakeOver + o.stakeUnder - 1) < 1e-12);
  const s = splitStake(o, 100);
  assert.equal(s.over + s.under, 100);
  // both legs pay the same
  assert.ok(Math.abs(s.over * 2.2 - s.under * 2.3) < 0.05);
});

test("no arb: one book's own prices, a dead-even pair, or over above the under's line", () => {
  assert.deepEqual(findOpportunities([b("A", 5.5, 120, 130)]), []);
  assert.deepEqual(findOpportunities([b("A", 18.5, 105, -125), b("B", 18.5, -115, -105)]), []); // +105 / -105 is exactly 0%
  assert.deepEqual(findOpportunities([b("A", 7.5, 150, -200), b("B", 5.5, -200, 150)]), []); // over 7.5 + under 5.5 can lose both
});

test("near-arbs show when the threshold goes below zero", () => {
  const books = [b("A", 24.5, 100, -120), b("B", 24.5, -120, -102)];
  assert.deepEqual(findOpportunities(books), []);
  const [o] = findOpportunities(books, { minMargin: -0.01, maxMiddleCost: 0.03 });
  assert.equal(o.kind, "arb");
  assert.ok(o.margin < 0 && o.margin > -0.01);
});

test("middle: over the lower line, under the higher, cost capped", () => {
  const books = [b("A", 23.5, -110, -110), b("B", 25.5, -110, -110)];
  // -110 / -110 costs 4.5% on a miss: over the default 3% cap
  assert.deepEqual(findOpportunities(books), []);
  const [m] = findOpportunities(books, { minMargin: 0, maxMiddleCost: 0.05 });
  assert.equal(m.kind, "middle");
  assert.equal(m.over.line, 23.5);
  assert.equal(m.under.line, 25.5);
  assert.ok(Math.abs(m.margin - -0.0455) < 0.0005);
  assert.ok(Math.abs(m.bothWin! - 0.909) < 0.001);
});

test("pairOf and quoteAge", () => {
  const p = pairOf({ book: "A", line: 1.5, price: 100 }, { book: "B", line: 1.5, price: 100 });
  assert.equal(p.margin, 0);
  const now = new Date("2026-10-12T17:00:00Z");
  assert.equal(quoteAge({ book: "A", line: 1, price: 100, updatedAt: "2026-10-12T16:58:30Z" }, now), 90);
  assert.equal(quoteAge({ book: "A", line: 1, price: 100 }, now), null);
});

test("arbRows: filters by kind, best margin first, locked rows carry no prices", () => {
  const market = SPORTS[0].markets[0];
  const player = (name: string) => ({ id: name, teamId: "", sport: "nba" as const, name, position: "" });
  const item = (id: string, books: ReturnType<typeof b>[], locked = false) => ({ id, sport: "nba" as const, gameId: "g", gameLabel: "X @ Y", startAt: "", inPlay: false, player: player(id), market, books, locked });
  const items = [
    item("small", [b("A", 5.5, 105, -110), b("B", 5.5, -110, 110)]),
    item("big", [b("A", 5.5, 120, -150), b("B", 5.5, -160, 130)]),
    item("hidden", [b("A", 5.5, 150, -150), b("B", 5.5, -150, 150)], true),
  ];
  const r = arbRows(items, { sport: "nba", plan: "free", minMargin: 0, maxMiddleCost: 0.03 });
  assert.deepEqual(r.rows.map((x) => x.player.name), ["big", "small", "hidden"]);
  assert.equal(r.locked, 1);
  assert.equal(r.rows[2].opp, null);
  assert.equal(arbRows(items, { sport: "nba", plan: "free", minMargin: 0, maxMiddleCost: 0.03, kind: "middle" }).total, 0);
});

test("scan snapshot includes games in play and bypasses Next's fetch cache", async () => {
  const cfg = oddsConfig({ ODDS_API_KEY: "k", ODDS_API_SCAN_TTL_SECONDS: "45", ODDS_API_INPLAY_HOURS: "3" })!;
  const inPlayAt = new Date(Date.parse(EVENTS[2].commence_time) + 3600_000); // e0z started an hour ago
  const calls: { url: string; revalidate?: number; cache?: string }[] = [];
  const base = fakeFetch();
  const f = (url: string, init?: { cache?: string; next?: { revalidate?: number } }) => { calls.push({ url, revalidate: init?.next?.revalidate, cache: init?.cache }); return base(url); };

  const board = await fetchSnapshot(cfg, "nba", inPlayAt, f);
  assert.ok(!board.games.some((g) => g.id === "nba-e0z"));
  assert.equal(calls[0].revalidate, cfg.ttlSeconds);

  calls.length = 0;
  const scan = await fetchSnapshot(cfg, "nba", inPlayAt, f, "scan");
  assert.equal(scan.kind, "scan");
  assert.ok(scan.games.some((g) => g.id === "nba-e0z"));
  // never from Next's fetch cache, which can hand back a stale price
  assert.ok(calls.every((c) => c.cache === "no-store" && c.revalidate === undefined));
  const from = new URL(calls[0].url).searchParams.get("commenceTimeFrom")!;
  assert.equal(Date.parse(from), inPlayAt.getTime() - 3 * 3600_000);
  // the fixture's in-play game carries an arb with timestamps on each book
  const duval = scan.props.find((p) => p.playerId === "nba-kasimir-duval")!;
  assert.ok(duval.books.every((x) => typeof x.updatedAt === "string"));
});

test("live arbs: in-play game first and open on free, separate cache from the board", async () => {
  const cfg = oddsConfig({ ODDS_API_KEY: "k", ODDS_API_SCAN_TTL_SECONDS: "60", ODDS_API_INPLAY_HOURS: "3" })!;
  const now = new Date(Date.parse(EVENTS[2].commence_time) + 3600_000);
  clearCache();
  const calls: string[] = [];
  await snapshot(cfg, "nba", now, fakeFetch({ calls }), "scan");
  await snapshot(cfg, "nba", now, fakeFetch({ calls })); // board: a different cache entry, so it fetches too
  const scanCalls = calls.length;
  await snapshot(cfg, "nba", new Date(now.getTime() + 30_000), fakeFetch({ calls }), "scan"); // within 60s: cached
  assert.equal(calls.length, scanCalls);

  const r = await arbs(cfg, { sport: "nba", plan: "free", minMargin: 0, maxMiddleCost: 0.03 }, new Date(now.getTime() + 30_000));
  assert.equal(r.error, undefined);
  assert.equal(r.inPlay, 1);
  const top = r.rows[0];
  assert.equal(top.player.name, "Kasimir Duval");
  assert.equal(top.kind, "arb");
  assert.equal(top.inPlay, true);
  assert.equal(top.locked, false);
  assert.ok(top.opp!.margin > 0);
  assert.ok(r.rows.some((x) => x.kind === "middle" && x.player.name === "Nico Abara"));
  assert.equal(r.nextAt, new Date(now.getTime() + 60_000).toISOString());
  clearCache();
});
