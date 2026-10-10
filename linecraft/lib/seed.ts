// Fictional seed data: invented leagues, teams and players. No real people.
// Swap for a licensed feed by implementing the same shapes (see data.ts).
import { rng, gauss } from "./rng.ts";

export type SportKey = "nba" | "nfl" | "mlb" | "nhl";

export interface Market {
  key: string;
  label: string;
  short: string;
  positions: string[];
}

export interface Sport {
  key: SportKey;
  name: string;
  markets: Market[];
  // roster template: position and per-market season mean
  roster: { position: string; means: Record<string, number> }[];
}

export interface Team { id: string; sport: SportKey; city: string; name: string; abbr: string }
export interface Player { id: string; teamId: string; sport: SportKey; name: string; position: string }
export interface GameLogEntry { date: string; opponentId: string; home: boolean; stats: Record<string, number> }
export interface Game { id: string; sport: SportKey; homeId: string; awayId: string; startAt: string }
export interface BookLine { book: string; line: number; over: number; under: number }
export interface PropMarket { id: string; gameId: string; playerId: string; market: string; books: BookLine[] }
export interface DefenseRow { teamId: string; position: string; market: string; allowed: number; rank: number }

export const BOOKS = ["Northbook", "Pinehill", "Atlasbet", "Harborline"];

export const SPORTS: Sport[] = [
  {
    key: "nba",
    name: "Basketball",
    markets: [
      { key: "points", label: "Points", short: "PTS", positions: ["G", "F", "C"] },
      { key: "rebounds", label: "Rebounds", short: "REB", positions: ["G", "F", "C"] },
      { key: "assists", label: "Assists", short: "AST", positions: ["G", "F", "C"] },
      { key: "threes", label: "3-pointers made", short: "3PM", positions: ["G", "F"] },
      { key: "pra", label: "Pts + Reb + Ast", short: "PRA", positions: ["G", "F", "C"] },
    ],
    roster: [
      { position: "G", means: { points: 24, rebounds: 4.5, assists: 7, threes: 2.8 } },
      { position: "G", means: { points: 15, rebounds: 3.5, assists: 4, threes: 2.2 } },
      { position: "F", means: { points: 19, rebounds: 7, assists: 3.5, threes: 1.8 } },
      { position: "F", means: { points: 11, rebounds: 5.5, assists: 2, threes: 1.2 } },
      { position: "C", means: { points: 16, rebounds: 11, assists: 2.5 } },
    ],
  },
  {
    key: "nfl",
    name: "Football",
    markets: [
      { key: "pass_yds", label: "Passing yards", short: "PASS", positions: ["QB"] },
      { key: "rush_yds", label: "Rushing yards", short: "RUSH", positions: ["QB", "RB"] },
      { key: "rec_yds", label: "Receiving yards", short: "REC YDS", positions: ["RB", "WR", "TE"] },
      { key: "receptions", label: "Receptions", short: "REC", positions: ["RB", "WR", "TE"] },
    ],
    roster: [
      { position: "QB", means: { pass_yds: 245, rush_yds: 18 } },
      { position: "RB", means: { rush_yds: 68, rec_yds: 22, receptions: 3 } },
      { position: "WR", means: { rec_yds: 72, receptions: 5.5 } },
      { position: "TE", means: { rec_yds: 41, receptions: 4 } },
    ],
  },
  {
    key: "mlb",
    name: "Baseball",
    markets: [
      { key: "hits", label: "Hits", short: "H", positions: ["IF", "OF"] },
      { key: "total_bases", label: "Total bases", short: "TB", positions: ["IF", "OF"] },
      { key: "strikeouts", label: "Pitcher strikeouts", short: "K", positions: ["SP"] },
    ],
    roster: [
      { position: "IF", means: { hits: 1.15, total_bases: 1.9 } },
      { position: "OF", means: { hits: 1.0, total_bases: 1.6 } },
      { position: "IF", means: { hits: 0.85, total_bases: 1.3 } },
      { position: "SP", means: { strikeouts: 6.2 } },
    ],
  },
  {
    key: "nhl",
    name: "Hockey",
    markets: [
      { key: "shots", label: "Shots on goal", short: "SOG", positions: ["F", "D"] },
      { key: "points", label: "Points", short: "PTS", positions: ["F", "D"] },
      { key: "saves", label: "Goalie saves", short: "SV", positions: ["G"] },
    ],
    roster: [
      { position: "F", means: { shots: 3.4, points: 1.0 } },
      { position: "F", means: { shots: 2.4, points: 0.7 } },
      { position: "D", means: { shots: 1.9, points: 0.5 } },
      { position: "G", means: { saves: 27 } },
    ],
  },
];

const CITIES = ["Harbor City", "Red Mesa", "Northfield", "Bayport", "Ironwood", "Silver Lake", "Crescent Bay", "Granite Falls"];
const ABBR = ["HBC", "RMS", "NFD", "BAY", "IRW", "SLK", "CRB", "GRF"];
const NICKNAMES: Record<SportKey, string[]> = {
  nba: ["Comets", "Sidewinders", "Lumberjacks", "Gulls", "Forge", "Loons", "Tides", "Rams"],
  nfl: ["Anchors", "Coyotes", "Pioneers", "Mariners", "Smelters", "Herons", "Sharks", "Quarrymen"],
  mlb: ["Pilots", "Scorpions", "Owls", "Crabs", "Miners", "Otters", "Pelicans", "Goats"],
  nhl: ["Icebreakers", "Vipers", "Wolves", "Seals", "Hammers", "Beavers", "Squalls", "Ridgebacks"],
};
const FIRST = ["Marcus", "Theo", "Andre", "Calvin", "Dorian", "Elias", "Felix", "Grady", "Hollis", "Isaiah", "Jalen", "Kellan", "Luca", "Mateo", "Nico", "Owen", "Pierce", "Quentin", "Rory", "Silas", "Tobias", "Ulric", "Vince", "Wes", "Xavi", "Yusuf", "Zane", "Rafael", "Darius", "Emmett"];
const LAST = ["Abernathy", "Brightwater", "Castellano", "Dunmore", "Everly", "Fairbanks", "Galloway", "Hartwell", "Ingram", "Jessup", "Kowalczyk", "Lindqvist", "Marchetti", "Nakamura-Reyes", "Okafor", "Pemberton", "Quarles", "Rosenthal", "Stavros", "Thibodeaux", "Underhill", "Valdivia", "Whitlock", "Yarborough", "Zielinski", "Ashcombe", "Blackwood", "Corrigan", "Delacroix", "Esposito"];

// Season so far. Football plays weekly, so its season is shorter.
const GAMES_IN_LOG: Record<SportKey, number> = { nba: 34, nfl: 12, mlb: 40, nhl: 32 };

export interface Seed {
  teams: Team[];
  players: Player[];
  logs: Map<string, GameLogEntry[]>; // most recent first
  games: Game[];
  props: PropMarket[];
  defense: DefenseRow[];
}

function round1(x: number) { return Math.round(x * 10) / 10; }
function toHalf(x: number) { return Math.max(0.5, Math.floor(x) + 0.5); }

function sample(r: () => number, mean: number): number {
  // Counts: non-negative integers with spread proportional to the mean.
  const sd = mean < 3 ? Math.sqrt(mean) * 0.95 : mean * (mean > 60 ? 0.3 : 0.33);
  return Math.max(0, Math.round(mean + gauss(r) * sd));
}

function dayISO(base: Date, offsetDays: number): string {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + offsetDays));
  return d.toISOString().slice(0, 10);
}

function derive(stats: Record<string, number>, sport: SportKey) {
  if (sport === "nba" && "points" in stats) stats.pra = stats.points + stats.rebounds + stats.assists;
  if (sport === "mlb" && "hits" in stats) stats.total_bases = Math.max(stats.hits, stats.total_bases);
  if (sport === "nhl" && "shots" in stats) stats.points = Math.min(stats.points, 4);
}

export function buildSeed(today: Date): Seed {
  const teams: Team[] = [];
  const players: Player[] = [];
  const logs = new Map<string, GameLogEntry[]>();
  const games: Game[] = [];
  const props: PropMarket[] = [];
  const defense: DefenseRow[] = [];

  for (const sport of SPORTS) {
    const r = rng(`sport:${sport.key}`);
    const sportTeams = CITIES.map((city, i) => ({
      id: `${sport.key}-${ABBR[i].toLowerCase()}`,
      sport: sport.key,
      city,
      name: NICKNAMES[sport.key][i],
      abbr: ABBR[i],
    }));
    teams.push(...sportTeams);

    // How generous each defence is, per position and market (1.0 = average).
    const factor = new Map<string, number>();
    for (const t of sportTeams) for (const m of sport.markets) for (const pos of m.positions)
      factor.set(`${t.id}|${pos}|${m.key}`, 0.82 + r() * 0.36);

    const sportPlayers: { p: Player; means: Record<string, number> }[] = [];
    sportTeams.forEach((t, ti) => {
      sport.roster.forEach((slot, si) => {
        const idx = (ti * 7 + si * 3 + sport.key.length * 5) % FIRST.length;
        const lidx = (ti * 11 + si * 5 + sport.key.charCodeAt(1)) % LAST.length;
        const p: Player = { id: `${t.id}-${si + 1}`, teamId: t.id, sport: sport.key, name: `${FIRST[idx]} ${LAST[lidx]}`, position: slot.position };
        const talent = 0.8 + r() * 0.4;
        const means: Record<string, number> = {};
        for (const [k, v] of Object.entries(slot.means)) means[k] = v * talent;
        players.push(p);
        sportPlayers.push({ p, means });
      });
    });

    // Game logs: the season so far, opponents rotate, every other game at home.
    for (const { p, means } of sportPlayers) {
      const pr = rng(`log:${p.id}`);
      const others = sportTeams.filter((t) => t.id !== p.teamId);
      const entries: GameLogEntry[] = [];
      for (let g = 0; g < GAMES_IN_LOG[sport.key]; g++) {
        const opp = others[(g * 3 + p.id.length) % others.length];
        const stats: Record<string, number> = {};
        for (const [k, mean] of Object.entries(means)) stats[k] = sample(pr, mean * (factor.get(`${opp.id}|${p.position}|${k}`) ?? 1));
        derive(stats, sport.key);
        entries.push({ date: dayISO(today, -(g + 1) * (sport.key === "nfl" ? 7 : 2)), opponentId: opp.id, home: g % 2 === 0, stats });
      }
      logs.set(p.id, entries);
    }

    // Defense vs position: average allowed, ranked (1 = allows the most).
    for (const m of sport.markets) for (const pos of m.positions) {
      const rows = sportTeams.map((t) => {
        const vals: number[] = [];
        for (const { p } of sportPlayers) if (p.position === pos)
          for (const e of logs.get(p.id)!) if (e.opponentId === t.id && m.key in e.stats) vals.push(e.stats[m.key]);
        const allowed = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        return { teamId: t.id, position: pos, market: m.key, allowed: round1(allowed), rank: 0 };
      });
      rows.sort((a, b) => b.allowed - a.allowed).forEach((row, i) => (row.rank = i + 1));
      defense.push(...rows);
    }

    // Today's slate: 4 games, times spread through the evening (UTC).
    const order = [...sportTeams];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (let g = 0; g < 4; g++) {
      const home = order[g * 2];
      const away = order[g * 2 + 1];
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23 + Math.floor(g / 2), g % 2 ? 30 : 0));
      const game: Game = { id: `${sport.key}-g${g + 1}`, sport: sport.key, homeId: home.id, awayId: away.id, startAt: start.toISOString() };
      games.push(game);

      for (const { p, means } of sportPlayers) {
        if (p.teamId !== home.id && p.teamId !== away.id) continue;
        const opp = p.teamId === home.id ? away : home;
        for (const m of sport.markets) {
          if (!m.positions.includes(p.position)) continue;
          const base = m.key === "pra" ? means.points + means.rebounds + means.assists : means[m.key];
          if (base === undefined) continue;
          const lr = rng(`line:${game.id}:${p.id}:${m.key}`);
          const f = m.key === "pra" ? 1 : factor.get(`${opp.id}|${p.position}|${m.key}`) ?? 1;
          // books shade toward the matchup but not all the way, so some edges exist
          const fair = toHalf(base * (1 + (f - 1) * 0.5) * (0.9 + lr() * 0.2));
          const books: BookLine[] = BOOKS.map((book) => {
            // small lines (hits, points) move on price, bigger ones on the number too
            const shift = fair >= 10 && lr() < 0.25 ? (lr() < 0.5 ? -1 : 1) : 0;
            const juice = -100 - Math.round(lr() * 30);
            const lean = Math.round((lr() - 0.5) * 40);
            return { book, line: Math.max(0.5, fair + shift), over: juice + lean, under: juice - lean };
          });
          props.push({ id: `${game.id}~${p.id}~${m.key}`, gameId: game.id, playerId: p.id, market: m.key, books });
        }
      }
    }
  }
  // American odds can't sit between -100 and +100.
  for (const prop of props) for (const b of prop.books) {
    b.over = fixOdds(b.over);
    b.under = fixOdds(b.under);
  }
  return { teams, players, logs, games, props, defense };
}

function fixOdds(o: number): number {
  // -90 means "better than even money", which is written +110
  return o > -100 && o < 100 ? 200 + o : o;
}
