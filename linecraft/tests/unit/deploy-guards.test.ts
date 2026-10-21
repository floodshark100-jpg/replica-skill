// Guards for a public live deployment: the password check behind proxy.ts and the
// credit floor that stops fetching before the odds account runs dry. The proxy
// itself is covered end to end in e2e/live/access.spec.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { allowed, passwordFrom } from "../../lib/access.ts";
import { oddsConfig } from "../../lib/odds-api.ts";
import { snapshot, clearCache, creditsRemaining } from "../../lib/live.ts";
import { NOW, fakeFetch } from "../fixtures/odds-api.ts";

const basic = (user: string, pass: string) => `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;

test("passwordFrom reads the Basic auth password, any username", () => {
  assert.equal(passwordFrom(basic("me", "s3cret:with:colons")), "s3cret:with:colons");
  assert.equal(passwordFrom(null), null);
  assert.equal(passwordFrom("Bearer x"), null);
  assert.equal(passwordFrom("Basic bm9jb2xvbg=="), null); // "nocolon"
});

test("allowed: open without a password, otherwise only the right one", () => {
  assert.equal(allowed(null, undefined), true);
  assert.equal(allowed(null, "  "), true);
  assert.equal(allowed(null, "hunter2"), false);
  assert.equal(allowed(basic("x", "wrong"), "hunter2"), false);
  assert.equal(allowed(basic("x", "hunter2x"), "hunter2"), false);
  assert.equal(allowed(basic("anyone", "hunter2"), "hunter2"), true);
});

// A fetch whose quota headers report `left` credits; counts the paid (odds/events) calls.
function quotaFetch(left: () => number, paid: string[]) {
  const base = fakeFetch();
  return async (url: string) => {
    const path = new URL(url).pathname;
    if (path === "/v4/sports") return new Response("[]", { headers: { "x-requests-remaining": String(left()), "x-requests-used": "0" } });
    paid.push(path);
    const r = await base(url);
    return new Response(await r.text(), { status: r.status, headers: { "content-type": "application/json", "x-requests-remaining": String(left()), "x-requests-used": "0" } });
  };
}

test("credit floor: pauses below ODDS_API_MIN_CREDITS, resumes when credits come back", async () => {
  const cfg = oddsConfig({ ODDS_API_KEY: "k", ODDS_API_MIN_CREDITS: "25", ODDS_API_TTL_SECONDS: "60" })!;
  clearCache();
  let left = 20;
  const paid: string[] = [];
  const f = quotaFetch(() => left, paid);

  // first fetch goes through (nothing known yet) and learns there are 20 left
  await snapshot(cfg, "nba", NOW, f);
  assert.equal(creditsRemaining(), 20);
  const firstPaid = paid.length;

  // after the TTL: below the floor, so only the free quota call is made, and it fails clearly
  const later = new Date(NOW.getTime() + 61_000);
  await assert.rejects(snapshot(cfg, "nba", later, f), /Paused to save credits: 20 left, below ODDS_API_MIN_CREDITS \(25\)/);
  assert.equal(paid.length, firstPaid);

  // credits topped up: the next retry (after the 60s failure TTL) fetches again
  left = 500;
  await snapshot(cfg, "nba", new Date(later.getTime() + 61_000), f);
  assert.ok(paid.length > firstPaid);
  assert.equal(creditsRemaining(), 500);
  clearCache();
});

test("credit floor 0 never pauses", async () => {
  const cfg = oddsConfig({ ODDS_API_KEY: "k", ODDS_API_MIN_CREDITS: "0", ODDS_API_TTL_SECONDS: "60" })!;
  clearCache();
  const paid: string[] = [];
  const f = quotaFetch(() => 1, paid);
  await snapshot(cfg, "nba", NOW, f);
  await snapshot(cfg, "nba", new Date(NOW.getTime() + 61_000), f);
  assert.ok(paid.length >= 2);
  clearCache();
});
