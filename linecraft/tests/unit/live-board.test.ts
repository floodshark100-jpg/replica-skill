import { test, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import { oddsConfig } from "../../lib/odds-api.ts";
import { snapshot, board, propDetail, gameCards, clearCache } from "../../lib/live.ts";
import { NOW, fakeFetch } from "../fixtures/odds-api.ts";

const cfg = oddsConfig({ ODDS_API_KEY: "k", ODDS_API_TTL_SECONDS: "86400" })!;

// board(), propDetail() and gameCards() read the cache with the current time, so pin the
// clock to the fixture's NOW; otherwise the primed snapshot expires a day later and they
// go to the network.
before(() => mock.timers.enable({ apis: ["Date"], now: NOW }));
after(() => mock.timers.reset());

// Prime the cache with the fixture so board() reads it instead of the network.
async function prime() {
  clearCache();
  await snapshot(cfg, "nba", NOW, fakeFetch());
}

test("live board: market columns, EV side, free plan opens the first game only", async () => {
  await prime();
  const pro = await board(cfg, { sport: "nba", plan: "pro", sort: "ev" });
  assert.equal(pro.error, undefined);
  assert.equal(pro.total, 3);
  assert.equal(pro.games, 2);
  for (const r of pro.rows) {
    assert.equal(r.hasStats, false);
    assert.equal(r.score, null);
    assert.ok(r.fair !== null && r.fair > 0 && r.fair < 1);
  }
  const evs = pro.rows.map((r) => r.ev!);
  assert.deepEqual([...evs].sort((a, b) => b - a), evs);

  // Marchetti 18.5: Book A over +105 is the stand-out price, so the over is the value side
  const m = pro.rows.find((r) => r.player.name === "Théo Marchetti")!;
  assert.equal(m.side, "over");
  assert.equal(m.bestOdds, 105);
  assert.ok(m.ev! > 0);
  // Okafor consensus is 24.5 (3 books) not the 26.5 alt
  assert.equal(pro.rows.find((r) => r.player.name === "Jalen Okafor")!.line, 24.5);

  const free = await board(cfg, { sport: "nba", plan: "free" });
  const locked = free.rows.filter((r) => r.locked);
  assert.equal(locked.length, 1);
  assert.equal(locked[0].gameId, "nba-e2b");
  assert.equal(locked[0].ev, null);
  assert.equal(locked[0].bestOdds, null);
});

test("live detail: every line, consensus first; locked on free for later games", async () => {
  await prime();
  const d = await propDetail(cfg, "nba-jalen-okafor", "points", "pro");
  assert.ok(d && d.kind === "live");
  assert.deepEqual(d.lines.map((l) => l.line), [24.5, 26.5]);
  assert.equal(d.lines[0].books.length, 3);
  const locked = await propDetail(cfg, "nba-rory-pemberton", undefined, "free");
  assert.equal(locked?.kind, "locked");
  assert.equal(await propDetail(cfg, "nba-nobody", undefined, "pro"), null);
});

test("live games: cards in start order with prop counts", async () => {
  await prime();
  const { cards, error } = await gameCards(cfg, "nba", "free");
  assert.equal(error, undefined);
  assert.deepEqual(cards.map((c) => [c.game.id, c.props, c.unlocked]), [["nba-e1a", 2, true], ["nba-e2b", 1, false]]);
  assert.equal(cards[0].home.name, "Comets");
});
