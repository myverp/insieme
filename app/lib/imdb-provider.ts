import { parseImdbRating } from "./imdb-rating.ts";

// Cooldowns are provider-wide and temporary, never represented as missing film ratings.
export function createImdbProvider({
  tmdbToken, omdbKey, request = fetch, now = Date.now,
}: { tmdbToken?: string; omdbKey?: string; request?: typeof fetch; now?: () => number }) {
  const blockedUntil = { tmdb: 0, omdb: 0 };

  async function get(provider: "tmdb" | "omdb", url: string, headers?: Record<string, string>) {
    if (now() < blockedUntil[provider]) throw new Error("Rating provider cooling down.");
    try {
      const response = await request(url, { headers, cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!response.ok) {
        const retry = response.headers.get("retry-after");
        const seconds = retry && /^\d+$/.test(retry) ? Number(retry) : 0;
        const retryAt = retry && !seconds ? Date.parse(retry) : 0;
        blockedUntil[provider] = Math.max(now() + 30_000, now() + seconds * 1000, Number.isFinite(retryAt) ? retryAt : 0);
        throw new Error("Rating provider request failed.");
      }
      return await response.json();
    } catch (error) {
      blockedUntil[provider] = Math.max(blockedUntil[provider], now() + 30_000);
      throw error;
    }
  }

  return async (tmdbId: number, cachedImdbId?: string) => {
    if (!tmdbToken || !omdbKey) throw new Error("Rating provider is not configured.");
    if (now() < blockedUntil.omdb) throw new Error("Rating provider cooling down.");
    // Do not use a title fallback: a failed identity lookup must not rate a different film.
    let imdbId = cachedImdbId;
    if (!imdbId) {
      const params = new URLSearchParams();
      const headers: Record<string, string> = { Accept: "application/json" };
      if (tmdbToken.length > 80 || tmdbToken.includes(".")) headers.Authorization = "Bearer " + tmdbToken;
      else params.set("api_key", tmdbToken);
      const data = await get("tmdb", "https://api.themoviedb.org/3/movie/" + tmdbId + "/external_ids?" + params, headers);
      if (!data || !Object.hasOwn(data, "imdb_id")) throw new Error("Invalid TMDb identity response.");
      if (data.imdb_id === null || data.imdb_id === "") return { imdbId: null, rating: null };
      imdbId = data.imdb_id;
    }
    if (typeof imdbId !== "string" || !/^tt\d+$/.test(imdbId)) throw new Error("Invalid IMDb ID.");
    const params = new URLSearchParams({ apikey: omdbKey, i: imdbId, type: "movie" });
    const data = await get("omdb", "https://www.omdbapi.com/?" + params);
    try {
      return { imdbId, rating: parseImdbRating(data) };
    } catch (error) {
      // A rejected individual ID must not block unrelated films.
      if (data?.Error !== "Incorrect IMDb ID.") {
        blockedUntil.omdb = now() + (/limit|key/i.test(data?.Error ?? "") ? 60 * 60 * 1000 : 30_000);
      }
      throw error;
    }
  };
}
