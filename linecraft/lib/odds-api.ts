// Client for The Odds API v4 (https://the-odds-api.com). Player props come from
// the per-event odds endpoint; every call costs quota (markets returned x regions),
// so callers cache. The key is never logged or sent to the browser.

export interface OddsApiConfig {
  key: string;
  baseUrl: string;
  // "us", "us2", "uk", "eu", "au" (comma separated); ignored when `bookmakers` is set
  regions: string;
  bookmakers: string | null;
  ttlSeconds: number;
  maxEvents: number;
  hoursAhead: number;
  // arbitrage scanner (/arbs): its own, shorter cache, and games already in play
  scanTtlSeconds: number;
  inPlayHours: number;
}

export function oddsConfig(env: Record<string, string | undefined> = process.env): OddsApiConfig | null {
  const key = env.ODDS_API_KEY?.trim();
  if (!key) return null;
  const int = (v: string | undefined, d: number, lo: number, hi: number) => {
    const n = Number(v);
    return Number.isFinite(n) && v !== undefined && v !== "" ? Math.min(hi, Math.max(lo, Math.round(n))) : d;
  };
  return {
    key,
    baseUrl: (env.ODDS_API_BASE_URL || "https://api.the-odds-api.com").replace(/\/$/, ""),
    regions: env.ODDS_API_REGIONS?.trim() || "us",
    bookmakers: env.ODDS_API_BOOKMAKERS?.trim() || null,
    ttlSeconds: int(env.ODDS_API_TTL_SECONDS, 1800, 60, 86400),
    maxEvents: int(env.ODDS_API_MAX_EVENTS, 6, 1, 30),
    hoursAhead: int(env.ODDS_API_HOURS_AHEAD, 36, 1, 168),
    scanTtlSeconds: int(env.ODDS_API_SCAN_TTL_SECONDS, 120, 30, 3600),
    inPlayHours: int(env.ODDS_API_INPLAY_HOURS, 4, 0, 12),
  };
}

export interface ApiEvent {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
}

export interface ApiOutcome {
  name: string; // "Over" | "Under" (or "Yes"/"No" on some markets, ignored)
  description?: string; // the player's name
  price: number;
  point?: number;
}

export interface ApiEventOdds extends ApiEvent {
  bookmakers: {
    key: string;
    title: string;
    last_update?: string;
    markets: { key: string; last_update?: string; outcomes: ApiOutcome[] }[];
  }[];
}

export class OddsApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type FetchLike = (url: string, init?: RequestInit & { next?: { revalidate?: number } }) => Promise<Response>;

export interface Usage { remaining: number | null; used: number | null }

// The API wants second precision: 2026-10-11T00:00:00Z
export function isoSeconds(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function explain(status: number, body: string): string {
  if (status === 401) return "The odds API rejected the key (401). Check ODDS_API_KEY.";
  if (status === 429) return "The odds API quota or rate limit is used up (429). Raise ODDS_API_TTL_SECONDS or lower ODDS_API_MAX_EVENTS.";
  if (status === 422) return `The odds API refused the request (422): ${body.slice(0, 200)}`;
  return `The odds API returned ${status}.`;
}

async function get<T>(cfg: OddsApiConfig, path: string, params: Record<string, string>, fetchImpl: FetchLike, revalidate: number): Promise<{ data: T; usage: Usage }> {
  const qs = new URLSearchParams({ ...params, apiKey: cfg.key });
  let res: Response;
  try {
    // `next.revalidate` lets Next share the cached response across server instances. Next serves a
    // stale entry while it refetches in the background, so `revalidate` 0 (the arbitrage scan) skips it.
    const cache: RequestInit & { next?: { revalidate?: number } } = revalidate > 0 ? { next: { revalidate } } : { cache: "no-store" };
    res = await fetchImpl(`${cfg.baseUrl}${path}?${qs}`, { ...cache, signal: AbortSignal.timeout(10_000) });
  } catch (e) {
    throw new OddsApiError(`Couldn't reach the odds API (${e instanceof Error ? e.name : "network error"}).`, 0);
  }
  const num = (h: string) => {
    const v = res.headers.get(h);
    return v === null || v === "" ? null : Number(v);
  };
  const usage = { remaining: num("x-requests-remaining"), used: num("x-requests-used") };
  if (!res.ok) throw new OddsApiError(explain(res.status, await res.text().catch(() => "")), res.status);
  return { data: (await res.json()) as T, usage };
}

// `startedWithinHours` > 0 also lists games that started that long ago (in play).
// `revalidate` is how long Next may reuse the response; 0 bypasses Next's cache (the scanner).
export function listEvents(cfg: OddsApiConfig, sportKey: string, now: Date, fetchImpl: FetchLike = fetch, startedWithinHours = 0, revalidate = cfg.ttlSeconds) {
  return get<ApiEvent[]>(cfg, `/v4/sports/${encodeURIComponent(sportKey)}/events`, {
    commenceTimeFrom: isoSeconds(new Date(now.getTime() - startedWithinHours * 3600_000)),
    commenceTimeTo: isoSeconds(new Date(now.getTime() + cfg.hoursAhead * 3600_000)),
    dateFormat: "iso",
  }, fetchImpl, revalidate);
}

export function eventOdds(cfg: OddsApiConfig, sportKey: string, eventId: string, markets: string[], fetchImpl: FetchLike = fetch, revalidate = cfg.ttlSeconds) {
  const where: Record<string, string> = cfg.bookmakers ? { bookmakers: cfg.bookmakers } : { regions: cfg.regions };
  return get<ApiEventOdds>(cfg, `/v4/sports/${encodeURIComponent(sportKey)}/events/${encodeURIComponent(eventId)}/odds`, {
    ...where,
    markets: markets.join(","),
    oddsFormat: "american",
    dateFormat: "iso",
  }, fetchImpl, revalidate);
}
