type OmdbMovie = {
  Response?: "True" | "False";
  imdbRating?: string;
};

type ImdbLookup = {
  imdbId?: string;
  tmdbId?: number;
  title?: string;
  year?: string;
};

export async function getImdbRating({ imdbId, tmdbId, title, year }: ImdbLookup) {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey || (!imdbId && !tmdbId && !title)) return 0;

  const resolvedImdbId = imdbId || (tmdbId ? await getImdbId(tmdbId) : "");

  const params = new URLSearchParams({ apikey: apiKey, type: "movie" });
  if (resolvedImdbId) params.set("i", resolvedImdbId);
  else {
    params.set("t", title!);
    if (year) params.set("y", year);
  }

  try {
    const response = await fetch(`https://www.omdbapi.com/?${params}`, { next: { revalidate: 86400 } });
    if (!response.ok) return 0;

    const data = (await response.json()) as OmdbMovie;
    if (data.Response !== "True" || !data.imdbRating || data.imdbRating === "N/A") return 0;

    const rating = Number(data.imdbRating);
    return Number.isFinite(rating) ? rating : 0;
  } catch {
    return 0;
  }
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
