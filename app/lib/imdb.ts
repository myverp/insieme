import { unstable_cache } from "next/cache";
import { parseImdbRating, type OmdbMovie } from "@/app/lib/imdb-rating";

type ImdbLookup = {
  imdbId?: string;
  tmdbId?: number;
  title?: string;
  year?: string;
  required?: boolean;
};

export async function getImdbRating({ imdbId, tmdbId, title, year, required = false }: ImdbLookup) {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey || (!imdbId && !tmdbId && !title)) {
    if (required) throw new Error("IMDb ratings are temporarily unavailable.");
    return 0;
  }

  const resolvedImdbId = imdbId || (tmdbId ? await getImdbId(tmdbId) : "");

  try {
    const lookup = resolvedImdbId
      ? { imdbId: resolvedImdbId, title: "", year: "" }
      : { imdbId: "", title: title!, year: year ?? "" };
    const data = await getCachedOmdbMovie(apiKey, lookup.imdbId, lookup.title, lookup.year);
    return parseImdbRating(data);
  } catch (error) {
    if (required) throw new Error("IMDb ratings are temporarily unavailable.", { cause: error });
    return 0;
  }
}

const getCachedOmdbMovie = unstable_cache(
  async (apiKey: string, imdbId: string, title: string, year: string) => {
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
  },
  ["omdb-movie-v2"],
  { revalidate: 86400 },
);

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
