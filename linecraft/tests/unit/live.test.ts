import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { oddsConfig, isoSeconds } from "../../lib/odds-api.ts";
import { fetchSnapshot, mapEventOdds, snapshot, clearCache, nickname, slug } from "../../lib/live.ts";
import { EVENTS, ODDS, NOW, fakeFetch } from "../fixtures/odds-api.ts";

const cfg = oddsConfig({ ODDS_API_KEY: "secret-key-123" })!;

beforeEach(() => clearCache());

test("config: off without a key, sane defaults, clamped overrides", () => {
  assert.equal(oddsConfig({}), null);
  assert.equal(oddsConfig({ ODDS_API_KEY: "  " }), null);
  assert.equal(cfg.regions, "us");
  assert.equal(cfg.ttlSeconds, 1800);
  assert.equal(cfg.maxEvents, 6);
  const c = oddsConfig({ ODDS_API_KEY: "k", ODDS_API_TTL_SECONDS: "5", ODDS_API_MAX_EVENTS: "999", ODDS_API_BOOKMAKERS: "draftkings,fanduel" })!;
  assert.equal(c.ttlSeconds, 60);
  assert.equal(c.maxEvents, 30);
  assert.equal(c.bookmakers, "draftkings,fanduel");
  assert.equal(isoSeconds(new Date("2026-10-11T12:00:00.123Z")), "2026-10-11T12:00:00Z");
});

test("names: nickname and URL-safe ids", () => {
  assert.equal(nickname("Harbor City Comets"), "Comets");
  assert.equal(nickname("Toronto Blue Jays"), "Blue Jays");
  assert.equal(slug("Théo Marchetti Jr."), "theo-marchetti-jr");
});

test("mapping pairs over/under per book and line, drops one-sided and unknown markets", () => {
  const { game, props } = mapEventOdds("nba", ODDS.e1a, new Map(), new Map());
  assert.equal(game.id, "nba-e1a");
  const okafor = props.find((p) => p.id === "nba-e1a~nba-jalen-okafor~points")!;
  assert.equal(okafor.books.length, 4); // A, B at 24.5 and 26.5, C
  assert.deepEqual(okafor.books.find((b) => b.book === "Book B" && b.line === 26.5), { book: "Book B", line: 26.5, over: 120, under: -150 });
  assert.equal(props.some((p) => p.market === "rebounds"), false);
  assert.equal(props.length, 2);
});

test("snapshot: upcoming events only, sorted, quota tracked, key sent but not leaked", async () => {
  const calls: string[] = [];
  const snap = await fetchSnapshot(cfg, "nba", NOW, fakeFetch({ calls }));
  assert.deepEqual(snap.games.map((g) => g.id), ["nba-e1a", "nba-e2b"]);
  assert.equal(snap.remaining, 480);
  const oddsCall = new URL(calls.find((c) => c.includes("/events/e1a/odds"))!);
  assert.equal(oddsCall.searchParams.get("apiKey"), "secret-key-123");
  assert.equal(oddsCall.searchParams.get("regions"), "us");
  assert.equal(oddsCall.searchParams.get("oddsFormat"), "american");
  assert.ok(oddsCall.searchParams.get("markets")!.split(",").includes("player_points_rebounds_assists"));
  assert.equal(calls.some((c) => c.includes("e0z")), false);
});

test("snapshot: one event failing keeps the rest and records a warning", async () => {
  const snap = await fetchSnapshot(cfg, "nba", NOW, fakeFetch({ fail: { "/events/e2b/": 422 } }));
  assert.equal(snap.games.length, 2);
  assert.equal(snap.props.filter((p) => p.gameId === "nba-e2b").length, 0);
  assert.match(snap.warnings[0], /422/);
});

test("snapshot: a bad key is a clear error with no key in it", async () => {
  await assert.rejects(fetchSnapshot(cfg, "nba", NOW, fakeFetch({ fail: { "/events": 401 } })), (e: Error) => {
    assert.match(e.message, /401/);
    assert.equal(e.message.includes("secret-key-123"), false);
    return true;
  });
});

test("cache: one fetch per TTL; failures retried after a minute", async () => {
  const calls: string[] = [];
  const f = fakeFetch({ calls });
  await snapshot(cfg, "nba", NOW, f);
  const n = calls.length;
  await snapshot(cfg, "nba", new Date(NOW.getTime() + 60_000), f);
  assert.equal(calls.length, n, "served from cache");
  await snapshot(cfg, "nba", new Date(NOW.getTime() + 31 * 60_000), f);
  assert.ok(calls.length > n, "refetched after TTL");

  clearCache();
  const bad = fakeFetch({ fail: { "/events": 500 } });
  await assert.rejects(snapshot(cfg, "nhl", NOW, bad));
  const good: string[] = [];
  await assert.rejects(snapshot(cfg, "nhl", new Date(NOW.getTime() + 30_000), fakeFetch({ calls: good })));
  assert.equal(good.length, 0, "failure cached briefly");
  await snapshot(cfg, "nhl", new Date(NOW.getTime() + 61_000), fakeFetch({ calls: good }));
  assert.ok(good.length > 0);
});

test("events fixture covers past, unsorted input", () => {
  assert.ok(EVENTS.some((e) => Date.parse(e.commence_time) < NOW.getTime()));
});
