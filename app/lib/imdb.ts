import { parseImdbRating, type OmdbMovie } from "@/app/lib/imdb-rating";
import { createAdminClient } from "@/app/lib/supabase/admin";

type ImdbLookup = {
  imdbId?: string;
  tmdbId?: number;
  title?: string;
  year?: string;
};

type CachedFilmRating = {
  imdb_id: string | null;
  imdb_rating: number | null;
  lookup_status: "ok" | "unavailable";
  fetched_at: string;
};

const RATING_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export async function getImdbRating({ imdbId, tmdbId, title, year }: ImdbLookup) {
  const admin = createAdminClient();
  if (admin && tmdbId) {
    const { data, error } = await admin
      .from("film_ratings")
      .select("imdb_id,imdb_rating,lookup_status,fetched_at")
      .eq("tmdb_id", tmdbId)
      .maybeSingle();

    if (error) console.error("IMDb cache read failed", { code: error.code });
    const cached = data as CachedFilmRating | null;
    if (cached && isFresh(cached.fetched_at)) return cached.imdb_rating ?? 0;
    if (!imdbId && cached?.imdb_id) imdbId = cached.imdb_id;
  }

  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey || (!imdbId && !tmdbId && !title)) {
    return 0;
  }

  const resolvedImdbId = imdbId || (tmdbId ? await getImdbId(tmdbId) : "");
  if (!resolvedImdbId && !title) {
    await cacheRating(tmdbId, null, null, "unavailable");
    return 0;
  }

  try {
    const lookup = resolvedImdbId
      ? { imdbId: resolvedImdbId, title: "", year: "" }
      : { imdbId: "", title: title!, year: year ?? "" };
    const data = await requestOmdbMovie(apiKey, lookup.imdbId, lookup.title, lookup.year);
    const rating = parseImdbRating(data);
    await cacheRating(tmdbId, resolvedImdbId || null, rating || null, rating ? "ok" : "unavailable");
    return rating;
  } catch {
    return 0;
  }
}

async function cacheRating(
  tmdbId: number | undefined,
  imdbId: string | null,
  rating: number | null,
  status: CachedFilmRating["lookup_status"],
) {
  const admin = createAdminClient();
  if (!admin || !tmdbId) return;

  const { error } = await admin.from("film_ratings").upsert({
    tmdb_id: tmdbId,
    imdb_id: imdbId,
    imdb_rating: rating,
    lookup_status: status,
    fetched_at: new Date().toISOString(),
  });
  if (error) console.error("IMDb cache write failed", { code: error.code });
}

function isFresh(fetchedAt: string) {
  const fetchedAtMs = Date.parse(fetchedAt);
  return Number.isFinite(fetchedAtMs) && Date.now() - fetchedAtMs < RATING_CACHE_MAX_AGE_MS;
}

async function requestOmdbMovie(apiKey: string, imdbId: string, title: string, year: string) {
  const params = new URLSearchParams({ apikey: apiKey, type: "movie" });
  if (imdbId) params.set("i", imdbId);
  else {
    params.set("t", title);
    if (year) params.set("y", year);
  }

  const response = await fetch(`https://www.omdbapi.com/?${params}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`OMDb request failed with status ${response.status}.`);
  const data = (await response.json()) as OmdbMovie;
  parseImdbRating(data);
  return data;
}

async function getImdbId(tmdbId: number) {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) return "";

  const isReadToken = token.length > 80 || token.includes(".");
  const params = new URLSearchParams();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (isReadToken) headers.Authorization = `Bearer ${token}`;
  else params.set("api_key", token);

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}/external_ids?${params}`,
      { headers, next: { revalidate: 86400 } },
    );
    if (!response.ok) return "";

    const data = (await response.json()) as { imdb_id?: string | null };
    return data.imdb_id ?? "";
  } catch {
    return "";
  }
}
