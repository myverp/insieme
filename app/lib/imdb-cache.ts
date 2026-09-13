import type { ImdbRating } from "./imdb-rating.ts";

export type CachedFilmRating = {
  imdb_id: string | null;
  imdb_rating: number | null;
  lookup_status: "ok" | "unavailable";
  fetched_at: string;
};
export const RATED_TTL = 24 * 60 * 60 * 1000;
export const UNRATED_TTL = 60 * 60 * 1000;

export function readFreshRating(cached: CachedFilmRating | null, now: number): ImdbRating | null {
  if (!cached) return null;
  const age = now - Date.parse(cached.fetched_at);
  const rated = cached.lookup_status === "ok" && /^tt\d+$/.test(cached.imdb_id ?? "") && typeof cached.imdb_rating === "number"
    && cached.imdb_rating > 0 && cached.imdb_rating <= 10;
  const unrated = cached.lookup_status === "unavailable" && cached.imdb_rating === null;
  if ((!rated && !unrated) || !Number.isFinite(age) || age < 0 || age >= (rated ? RATED_TTL : UNRATED_TTL)) return null;
  return { rating: rated ? cached.imdb_rating : null, ratingStatus: rated ? "rated" : "unrated" };
}

// One shared service per server process: coalesces duplicate lookups and bounds provider fan-out.
export function createRatingService({
  read, write, lookup, now = Date.now,
}: {
  read: (id: number) => Promise<CachedFilmRating | null>;
  write: (id: number, value: CachedFilmRating) => Promise<void>;
  lookup: (id: number, imdbId?: string) => Promise<{ imdbId: string | null; rating: number | null }>;
  now?: () => number;
}) {
  const memory = new Map<number, CachedFilmRating>();
  const pending = new Map<number, Promise<ImdbRating>>();
  const waiting: Array<() => void> = [];
  let active = 0;

  async function run(id: number): Promise<ImdbRating> {
    if (active >= 4) await new Promise<void>((resolve) => waiting.push(resolve));
    else active++;
    try {
      const cached = memory.get(id) ?? await read(id).catch(() => null);
      const fresh = readFreshRating(cached, now());
      if (fresh) {
        remember(id, cached!);
        return fresh;
      }
      const result = await lookup(id, cached?.imdb_id ?? undefined);
      const entry: CachedFilmRating = {
        imdb_id: result.imdbId, imdb_rating: result.rating,
        lookup_status: result.rating === null ? "unavailable" : "ok",
        fetched_at: new Date(now()).toISOString(),
      };
      remember(id, entry);
      await write(id, entry).catch(() => undefined);
      return { rating: result.rating, ratingStatus: result.rating === null ? "unrated" : "rated" };
    } catch {
      // Failures never enter either rating cache; provider cooldowns govern retry timing.
      return { rating: null, ratingStatus: "unavailable" };
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  }

  function remember(id: number, entry: CachedFilmRating) {
    memory.delete(id);
    memory.set(id, entry);
    if (memory.size > 500) memory.delete(memory.keys().next().value!);
  }

  return (id: number) => {
    const existing = pending.get(id);
    if (existing) return existing;
    const promise = run(id).finally(() => pending.delete(id));
    pending.set(id, promise);
    return promise;
  };
}
