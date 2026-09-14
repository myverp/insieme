import { NextRequest, NextResponse } from "next/server";
import { getImdbRating } from "@/app/lib/imdb";
import { collectMovieResults, mergeMovieResults } from "@/app/lib/movie-results";

type TmdbMovie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  overview?: string;
  popularity?: number;
  genre_ids?: number[];
};

type TmdbMovieResponse = { page?: number; results?: TmdbMovie[]; total_pages?: number; status_message?: string };
type TmdbPerson = { id: number; name: string; known_for_department?: string; popularity?: number };
type TmdbPersonResponse = { results?: TmdbPerson[]; status_message?: string };
type TmdbCreditsResponse = { crew?: Array<TmdbMovie & { job?: string }>; status_message?: string };

const allowedSorts = new Set(["popularity.desc", "imdb_rating.desc", "primary_release_date.desc", "primary_release_date.asc"]);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = params.get("query")?.trim() ?? "";
  const director = params.get("director")?.trim() ?? "";
  const genre = parseNumber(params.get("genre"));
  const decade = parseNumber(params.get("decade"));
  const rawMinRating = params.get("minRating");
  const minRating = rawMinRating?.trim() ? Number(rawMinRating) : null;
  const startPage = Number(params.get("page") ?? "1");
  const requestedSort = params.get("sort") ?? "popularity.desc";
  const sort = allowedSorts.has(requestedSort) ? requestedSort : "popularity.desc";
  const token = process.env.TMDB_READ_TOKEN;
  const hasFilters = Boolean(director || genre || decade || minRating !== null || sort !== "popularity.desc");

  if (minRating !== null && (!Number.isFinite(minRating) || minRating < 0 || minRating > 10)) {
    return NextResponse.json({ error: "Minimum IMDb rating must be between 0 and 10." }, { status: 400 });
  }

  if (!Number.isInteger(startPage) || startPage < 1 || startPage > 500) {
    return NextResponse.json({ error: "Page must be an integer between 1 and 500." }, { status: 400 });
  }

  if (query.length === 1) {
    return NextResponse.json({ error: "Enter at least two characters." }, { status: 400 });
  }
  if (!token) {
    return NextResponse.json({ error: "Film search needs a TMDb API token." }, { status: 503 });
  }
  const isReadToken = token.length > 80 || token.includes(".");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (isReadToken) headers.Authorization = `Bearer ${token}`;

  async function tmdb<T>(path: string, searchParams: URLSearchParams) {
    searchParams.set("language", "en-US");
    if (!isReadToken) searchParams.set("api_key", token!);
    const response = await fetch(`https://api.themoviedb.org/3/${path}?${searchParams}`, { headers, signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } });
    const data = (await response.json()) as T & { status_message?: string };
    if (!response.ok) throw new Error(data.status_message ?? "TMDb search failed.");
    return data;
  }

  try {
    let resolvedDirector = "";
    let directedIds: Set<number> | null = null;
    let directedMovies: TmdbMovie[] = [];

    if (director) {
      const people = await tmdb<TmdbPersonResponse>("search/person", new URLSearchParams({ query: director, include_adult: "false", page: "1" }));
      const person = [...(people.results ?? [])].sort((a, b) => {
        const directingDifference = Number(b.known_for_department === "Directing") - Number(a.known_for_department === "Directing");
        return directingDifference || (b.popularity ?? 0) - (a.popularity ?? 0);
      })[0];

      if (!person) return NextResponse.json({ movies: [], message: `No director found for “${director}”.` });

      resolvedDirector = person.name;
      const credits = await tmdb<TmdbCreditsResponse>(`person/${person.id}/movie_credits`, new URLSearchParams());
      directedMovies = Array.from(new Map(
        (credits.crew ?? []).filter((credit) => credit.job === "Director").map((movie) => [movie.id, movie]),
      ).values());
      directedIds = new Set(directedMovies.map((movie) => movie.id));
    }

    const applyLocalFilters = (movies: TmdbMovie[]) => movies.filter((movie) => {
      const year = Number(movie.release_date?.slice(0, 4));
      return (!genre || movie.genre_ids?.includes(genre))
        && (!decade || (year >= decade && year <= decade + 9));
    });

    const loadPage = async (page: number) => {
      if (director && !query) {
        const candidates = applyLocalFilters(directedMovies);
        return { movies: candidates.slice((page - 1) * 20, page * 20), hasMore: page * 20 < candidates.length };
      }

      if (query) {
        const searched = await tmdb<TmdbMovieResponse>("search/movie", new URLSearchParams({
          query,
          include_adult: "false",
          page: String(page),
        }));
        const movies = directedIds
          ? (searched.results ?? []).filter((movie) => directedIds.has(movie.id))
          : (searched.results ?? []);
        return { movies: applyLocalFilters(movies), hasMore: page < (searched.total_pages ?? 1) };
      }

      const discoverParams = new URLSearchParams({ include_adult: "false", include_video: "false", page: String(page), sort_by: sort === "imdb_rating.desc" ? "popularity.desc" : sort });
      if (genre) discoverParams.set("with_genres", String(genre));

      if (decade) {
        discoverParams.set("primary_release_date.gte", `${decade}-01-01`);
        discoverParams.set("primary_release_date.lte", `${decade + 9}-12-31`);
      }
      const discovered = await tmdb<TmdbMovieResponse>("discover/movie", discoverParams);
      return { movies: applyLocalFilters(discovered.results ?? []), hasMore: page < (discovered.total_pages ?? 1) };
    };

    const batch = await collectMovieResults({
      loadPage,
      rateMovie: (movie) => getImdbRating({ tmdbId: movie.id }),
      minRating,
      startPage,
      requireRatings: sort === "imdb_rating.desc",
    });

    return NextResponse.json({
      ...batch,
      movies: mergeMovieResults([], batch.movies.map(toMovie), sort),
      message: [
        resolvedDirector ? `Films directed by ${resolvedDirector}.` : "",
        batch.unavailable ? "Some IMDb ratings could not be retrieved. Rating checks are incomplete." : "",
      ].filter(Boolean).join(" "),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message.startsWith("IMDb ratings") ? error.message : "Film search is temporarily unavailable. Please retry." }, { status: 502 });
  }
}

function parseNumber(value: string | null) {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toMovie(movie: TmdbMovie & { rating: number | null; ratingStatus: "rated" | "unrated" | "unavailable" }) {
  return {
    id: movie.id,
    title: movie.title,
    year: movie.release_date?.slice(0, 4) ?? "",
    poster: movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : "",
    overview: movie.overview ?? "",
    rating: movie.rating,
    ratingStatus: movie.ratingStatus,
    ratingSource: "imdb" as const,
    popularity: movie.popularity ?? 0,
    releaseDate: movie.release_date ?? "",
  };
}
