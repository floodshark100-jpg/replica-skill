import { test } from "node:test";
import assert from "node:assert/strict";
import { board, propDetail, games, isUnlocked, consensusLine, seed, matchups, SPORTS } from "../../lib/data.ts";

test("seed is deterministic for the same day", () => {
  const a = JSON.stringify(seed(new Date("2026-10-10T12:00:00Z")).props.slice(0, 5));
  const b = JSON.stringify(seed(new Date("2026-10-10T18:00:00Z")).props.slice(0, 5));
  assert.equal(a, b);
});

test("every sport has games and props", () => {
  for (const s of SPORTS) {
    assert.ok(games(s.key).length > 0, s.key);
    assert.ok(board({ sport: s.key, plan: "pro" }).total > 0, s.key);
  }
});

test("free plan gets numbers for the first game only, and none for the rest", () => {
  const free = board({ sport: "nba", plan: "free" });
  const first = games("nba")[0].id;
  for (const r of free.rows) {
    if (r.gameId === first) assert.equal(r.locked, false);
    else {
      assert.equal(r.locked, true);
      assert.equal(r.score, null);
      assert.equal(r.l10, null);
      assert.equal(r.bestOdds, null);
    }
  }
  assert.ok(free.locked > 0);
  assert.equal(board({ sport: "nba", plan: "pro" }).locked, 0);
  assert.equal(isUnlocked(games("nba")[1], "free"), false);
});

test("locked player page returns no detail on free", () => {
  const lockedRow = board({ sport: "nba", plan: "free" }).rows.find((r) => r.locked)!;
  const d = propDetail(lockedRow.player.id, lockedRow.market.key, "free");
  assert.ok(d && "locked" in d);
  const p = propDetail(lockedRow.player.id, lockedRow.market.key, "pro");
  assert.ok(p && !("locked" in p) && p.log.length > 0);
});

test("sorting by rating is descending with locked rows last", () => {
  const rows = board({ sport: "nfl", plan: "free", sort: "score" }).rows;
  const open = rows.filter((r) => !r.locked);
  for (let i = 1; i < open.length; i++) assert.ok((open[i - 1].score ?? -1) >= (open[i].score ?? -1));
  const firstLocked = rows.findIndex((r) => r.locked);
  assert.ok(rows.slice(firstLocked).every((r) => r.locked));
});

test("filters: market, search, opponent, min rating", () => {
  assert.ok(board({ sport: "nba", market: "points", plan: "pro" }).rows.every((r) => r.market.key === "points"));
  const one = board({ sport: "nba", plan: "pro" }).rows[0];
  const byName = board({ sport: "nba", q: one.player.name.toUpperCase(), plan: "pro" }).rows;
  assert.ok(byName.length > 0 && byName.every((r) => r.player.id === one.player.id));
  assert.ok(board({ sport: "nba", opp: one.opp.abbr.toLowerCase(), plan: "pro" }).rows.every((r) => r.opp.id === one.opp.id));
  assert.ok(board({ sport: "nba", minScore: 70, plan: "pro" }).rows.every((r) => (r.score ?? 0) >= 70));
  assert.equal(board({ sport: "nba", q: "zzzz-nobody", plan: "pro" }).total, 0);
});

test("consensus line is the most common, ties go low", () => {
  const b = (line: number) => ({ book: "x", line, over: -110, under: -110 });
  assert.equal(consensusLine([b(22.5), b(22.5), b(23.5), b(21.5)]), 22.5);
  assert.equal(consensusLine([b(23.5), b(21.5)]), 21.5);
});

test("odds never sit between -100 and +100", () => {
  for (const p of seed().props) for (const bk of p.books) {
    assert.ok(bk.over <= -100 || bk.over >= 100, String(bk.over));
    assert.ok(bk.under <= -100 || bk.under >= 100, String(bk.under));
  }
});

test("matchup ranks run 1..n with no gaps", () => {
  const rows = matchups("nba", "G", "points");
  assert.deepEqual(rows.map((r) => r.rank), rows.map((_, i) => i + 1));
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].allowed >= rows[i].allowed);
});

test("unknown ids return null", () => {
  assert.equal(propDetail("nope", undefined, "pro"), null);
});
