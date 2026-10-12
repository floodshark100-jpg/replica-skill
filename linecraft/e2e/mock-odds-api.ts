// A stand-in for The Odds API for the live-mode e2e run: serves the unit-test
// fixture, with start times moved to "later today" so they're always upcoming.
// Run with: node e2e/mock-odds-api.ts <port>
import { createServer } from "node:http";
import { EVENTS, ODDS } from "../tests/fixtures/odds-api.ts";

const port = Number(process.argv[2] ?? 3201);
const at = (i: number) => new Date(Date.now() + (2 + i) * 3600_000).toISOString().replace(/\.\d{3}Z$/, "Z");
const ago = (s: number) => new Date(Date.now() - s * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
// e0z is in play: started 30 minutes ago, so only the arbitrage scan picks it up.
// Its books' timestamps move too: Book A fresh, Book B five minutes stale.
const shift = <T extends { id: string; commence_time: string; bookmakers?: { key: string; last_update?: string; markets: { last_update?: string }[] }[] }>(e: T): T => {
  const i = EVENTS.findIndex((x) => x.id === e.id);
  if (e.id !== "e0z") return { ...e, commence_time: at(i === 1 ? 0 : 1) };
  const stamp = (key: string) => ago(key === "booka" ? 20 : 300);
  return {
    ...e,
    commence_time: ago(30 * 60),
    ...(e.bookmakers && { bookmakers: e.bookmakers.map((b) => ({ ...b, last_update: stamp(b.key), markets: b.markets.map((m) => ({ ...m, last_update: stamp(b.key) })) })) }),
  };
};

createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { "content-type": "application/json", "x-requests-remaining": "480", "x-requests-used": "20" });
    res.end(JSON.stringify(body));
  };
  if (url.searchParams.get("apiKey") !== "e2e-key") return send(401, { message: "bad key" });
  const m = url.pathname.match(/^\/v4\/sports\/([a-z_]+)\/events(?:\/([^/]+)\/odds)?$/);
  if (!m) return send(404, { message: "not found" });
  // only basketball has a slate in the fixture; other sports are empty
  if (m[1] !== "basketball_nba") return send(200, []);
  if (!m[2]) return send(200, EVENTS.map(shift));
  const odds = ODDS[m[2]];
  return odds ? send(200, shift(odds)) : send(404, { message: "no event" });
}).listen(port, () => console.log(`mock odds api on ${port}`));
