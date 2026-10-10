import { test } from "node:test";
import assert from "node:assert/strict";
import { hitRate, average, rating, favouredSide, bestOdds, impliedProbability } from "../../lib/stats.ts";

test("hit rate counts pushes as neither hit nor miss", () => {
  const r = hitRate([10, 12, 11, 9, 11], 11, "over");
  assert.deepEqual(r, { hits: 1, misses: 2, pushes: 2, rate: 1 / 3 });
});

test("under hit rate mirrors over", () => {
  assert.equal(hitRate([1, 2, 3, 4], 2.5, "under").rate, 0.5);
  assert.equal(hitRate([1, 1, 1], 2.5, "under").rate, 1);
});

test("all pushes or no games gives a null rate, not 0 or 100", () => {
  assert.equal(hitRate([5, 5], 5, "over").rate, null);
  assert.equal(hitRate([], 5, "over").rate, null);
  assert.equal(average([]), null);
});

test("rating is null under the minimum sample", () => {
  const r = rating({ l5: 1, l10: 1, season: 1, matchupRank: 1, teams: 8, l10Avg: 30, line: 20, side: "over", sample: 4 });
  assert.equal(r.score, null);
});

test("rating stays in 0-100 and weights sum to 1", () => {
  const best = rating({ l5: 1, l10: 1, season: 1, matchupRank: 1, teams: 8, l10Avg: 100, line: 10, side: "over", sample: 20 });
  const worst = rating({ l5: 0, l10: 0, season: 0, matchupRank: 1, teams: 8, l10Avg: 100, line: 10, side: "under", sample: 20 });
  assert.equal(best.score, 100);
  assert.equal(worst.score, 0);
  assert.equal(Math.round(best.parts.reduce((s, p) => s + p.weight, 0) * 100), 100);
});

test("a soft matchup helps the over and hurts the under", () => {
  const base = { l5: 0.5, l10: 0.5, season: 0.5, teams: 8, l10Avg: 20, line: 20, sample: 20 };
  const overSoft = rating({ ...base, matchupRank: 1, side: "over" }).score!;
  const overHard = rating({ ...base, matchupRank: 8, side: "over" }).score!;
  const underSoft = rating({ ...base, matchupRank: 1, side: "under" }).score!;
  assert.ok(overSoft > overHard);
  assert.ok(underSoft < overSoft);
});

test("favoured side follows the L10 average", () => {
  assert.equal(favouredSide(25, 22.5), "over");
  assert.equal(favouredSide(20, 22.5), "under");
  assert.equal(favouredSide(null, 22.5), "over");
});

test("best odds is the biggest payout", () => {
  assert.equal(bestOdds([-110, +105, -120]), 105);
  assert.equal(bestOdds([-130, -105]), -105);
  assert.equal(bestOdds([]), null);
  assert.ok(Math.abs(impliedProbability(-110) - 0.5238) < 0.001);
});
