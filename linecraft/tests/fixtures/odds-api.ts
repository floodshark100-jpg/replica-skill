// Hand-written in The Odds API v4 response shape (events list and per-event
// odds with player-prop outcomes). Not a recorded response: teams, players and
// prices are made up.
import type { ApiEvent, ApiEventOdds } from "../../lib/odds-api.ts";

const soon = (h: number) => new Date(Date.UTC(2026, 9, 11, 23 + h, 0, 0)).toISOString().replace(".000Z", "Z");

export const NOW = new Date(Date.UTC(2026, 9, 11, 12, 0, 0));

export const EVENTS: ApiEvent[] = [
  { id: "e2b", sport_key: "basketball_nba", commence_time: soon(1), home_team: "Granite Falls Rams", away_team: "Silver Lake Loons" },
  { id: "e1a", sport_key: "basketball_nba", commence_time: soon(0), home_team: "Harbor City Comets", away_team: "Bayport Gulls" },
  // already started: must be left out
  { id: "e0z", sport_key: "basketball_nba", commence_time: "2026-10-11T02:00:00Z", home_team: "Red Mesa Sidewinders", away_team: "Ironwood Forge" },
];

const o = (name: string, description: string, price: number, point: number) => ({ name, description, price, point });

export const ODDS: Record<string, ApiEventOdds> = {
  e1a: {
    ...EVENTS[1],
    bookmakers: [
      {
        key: "booka", title: "Book A",
        markets: [
          { key: "player_points", outcomes: [o("Over", "Jalen Okafor", -110, 24.5), o("Under", "Jalen Okafor", -110, 24.5), o("Over", "Théo Marchetti", 105, 18.5), o("Under", "Théo Marchetti", -125, 18.5)] },
          { key: "player_rebounds", outcomes: [o("Over", "Jalen Okafor", -120, 7.5)] }, // one side only: dropped
          { key: "player_double_double", outcomes: [{ name: "Yes", description: "Jalen Okafor", price: 200 }] }, // not a market we use
        ],
      },
      {
        key: "bookb", title: "Book B",
        markets: [
          { key: "player_points", outcomes: [o("Over", "Jalen Okafor", -105, 24.5), o("Under", "Jalen Okafor", -115, 24.5), o("Over", "Jalen Okafor", 120, 26.5), o("Under", "Jalen Okafor", -150, 26.5), o("Over", "Théo Marchetti", -115, 18.5), o("Under", "Théo Marchetti", -105, 18.5)] },
        ],
      },
      {
        key: "bookc", title: "Book C",
        markets: [{ key: "player_points", outcomes: [o("Over", "Jalen Okafor", -112, 24.5), o("Under", "Jalen Okafor", -108, 24.5)] }],
      },
    ],
  },
  // in play (only the arbitrage scan fetches it): an arb on Duval, a middle on Abara
  e0z: {
    ...EVENTS[2],
    bookmakers: [
      {
        key: "booka", title: "Book A", last_update: "2026-10-11T02:59:00Z",
        markets: [
          { key: "player_points", last_update: "2026-10-11T02:58:40Z", outcomes: [o("Over", "Kasimir Duval", 115, 21.5), o("Under", "Kasimir Duval", -140, 21.5)] },
          { key: "player_assists", last_update: "2026-10-11T02:58:40Z", outcomes: [o("Over", "Nico Abara", -105, 9.5), o("Under", "Nico Abara", -115, 9.5)] },
        ],
      },
      {
        key: "bookb", title: "Book B", last_update: "2026-10-11T02:50:00Z",
        markets: [
          { key: "player_points", last_update: "2026-10-11T02:50:00Z", outcomes: [o("Over", "Kasimir Duval", -150, 21.5), o("Under", "Kasimir Duval", 125, 21.5)] },
          { key: "player_assists", last_update: "2026-10-11T02:50:00Z", outcomes: [o("Over", "Nico Abara", 140, 11.5), o("Under", "Nico Abara", -102, 11.5)] },
        ],
      },
    ],
  },
  e2b: {
    ...EVENTS[0],
    bookmakers: [
      { key: "booka", title: "Book A", markets: [{ key: "player_assists", outcomes: [o("Over", "Rory Pemberton", -140, 6.5), o("Under", "Rory Pemberton", 115, 6.5)] }] },
    ],
  },
};

export function fakeFetch(opts: { fail?: Record<string, number>; calls?: string[] } = {}) {
  return async (url: string) => {
    opts.calls?.push(url);
    const path = new URL(url).pathname;
    const status = Object.entries(opts.fail ?? {}).find(([k]) => path.includes(k))?.[1];
    const headers = { "x-requests-remaining": "480", "x-requests-used": "20", "content-type": "application/json" };
    if (status) return new Response(JSON.stringify({ message: "nope" }), { status, headers });
    if (path.endsWith("/events")) return new Response(JSON.stringify(EVENTS), { headers });
    const id = path.split("/events/")[1]?.split("/")[0];
    const body = ODDS[id];
    return body ? new Response(JSON.stringify(body), { headers }) : new Response("{}", { status: 404, headers });
  };
}
