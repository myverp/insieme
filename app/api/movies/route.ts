import { NextRequest, NextResponse } from "next/server";
import { getImdbRating } from "@/app/lib/imdb";
import { collectMovieResults, type RatedMovie } from "@/app/lib/movie-results";

type TmdbMovie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  overview?: string;
  vote_average?: number;
  popularity?: number;
  genre_ids?: number[];
};

type TmdbMovieResponse = { page?: number; results?: TmdbMovie[]; total_pages?: number; status_message?: string };
type TmdbPerson = { id: number; name: string; known_for_department?: string; popularity?: number };
type TmdbPersonResponse = { results?: TmdbPerson[]; status_message?: string };
type TmdbCreditsResponse = { crew?: Array<TmdbMovie & { job?: string }>; status_message?: string };

const allowedSorts = new Set(["popularity.desc", "imdb_rating.desc", "primary_release_date.desc", "primary_release_date.asc"]);

// High-rating searches enrich several TMDb pages with IMDb data. Give that
// bounded scan enough time to finish instead of failing at Vercel's default.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = params.get("query")?.trim() ?? "";
  const director = params.get("director")?.trim() ?? "";
  const genre = parseNumber(params.get("genre"));
  const decade = parseNumber(params.get("decade"));
  const rawMinRating = params.get("minRating");
  const minRating = parseNumber(rawMinRating);
  const requestedSort = params.get("sort") ?? "popularity.desc";
  const sort = allowedSorts.has(requestedSort) ? requestedSort : "popularity.desc";
  const token = process.env.TMDB_READ_TOKEN;
  const hasFilters = Boolean(director || genre || decade || minRating || sort !== "popularity.desc");

  if (rawMinRating && (!Number.isFinite(Number(rawMinRating)) || minRating < 0 || minRating > 10)) {
    return NextResponse.json({ error: "Minimum IMDb rating must be between 0 and 10." }, { status: 400 });
  }

  if ((!query || query.length < 2) && !hasFilters) {
    return NextResponse.json({ error: "Enter a title or choose at least one filter." }, { status: 400 });
  }
  if (query.length === 1) {
    return NextResponse.json({ error: "Enter at least two characters." }, { status: 400 });
  }
  if (!token) {
    return NextResponse.json({ error: "Film search needs a TMDb API token." }, { status: 503 });
  }
  if ((minRating || sort === "imdb_rating.desc") && !process.env.OMDB_API_KEY) {
    return NextResponse.json({ error: "IMDb filtering needs an OMDb API key." }, { status: 503 });
  }

  const isReadToken = token.length > 80 || token.includes(".");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (isReadToken) headers.Authorization = `Bearer ${token}`;

  async function tmdb<T>(path: string, searchParams: URLSearchParams) {
    searchParams.set("language", "en-US");
    if (!isReadToken) searchParams.set("api_key", token!);
    const response = await fetch(`https://api.themoviedb.org/3/${path}?${searchParams}`, { headers, next: { revalidate: 3600 } });
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
        return { movies: applyLocalFilters(directedMovies), hasMore: false };
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

      const tmdbSort = sort === "imdb_rating.desc" ? "popularity.desc" : sort;
      const discoverParams = new URLSearchParams({ include_adult: "false", include_video: "false", page: String(page), sort_by: tmdbSort });
      if (genre) discoverParams.set("with_genres", String(genre));
      if (decade) {
        discoverParams.set("primary_release_date.gte", `${decade}-01-01`);
        discoverParams.set("primary_release_date.lte", `${decade + 9}-12-31`);
      }
      const discovered = await tmdb<TmdbMovieResponse>("discover/movie", discoverParams);
      return { movies: applyLocalFilters(discovered.results ?? []), hasMore: page < (discovered.total_pages ?? 1) };
    };

    let ratingFailures = 0;
    const filteredMovies = await collectMovieResults({
      loadPage,
      rateMovie: (movie) => getImdbRating({
        tmdbId: movie.id,
        title: movie.title,
        year: movie.release_date?.slice(0, 4),
        required: Boolean(minRating || sort === "imdb_rating.desc"),
      }),
      getMovieId: (movie) => movie.id,
      onRateError: () => {
        ratingFailures += 1;
      },
      minRating,
      compare: (first, second) => compareMovies(first, second, sort),
      maxPages: minRating >= 8 ? 10 : 5,
      scanAllPages: sort === "imdb_rating.desc",
    });

    return NextResponse.json({
      movies: filteredMovies.map(({ movie, rating }) => toMovie(movie, rating)),
      message: resolvedDirector
        ? `Films directed by ${resolvedDirector}.`
        : ratingFailures && filteredMovies.length
          ? "Some films could not be rated by IMDb and were skipped."
          : ratingFailures
            ? "IMDb ratings are temporarily unavailable. Try again shortly."
            : "",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "TMDb is temporarily unavailable." }, { status: 502 });
  }
}

function parseNumber(value: string | null) {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareMovies(a: RatedMovie<TmdbMovie>, b: RatedMovie<TmdbMovie>, sort: string) {
  if (sort === "imdb_rating.desc") return b.rating - a.rating || (b.movie.popularity ?? 0) - (a.movie.popularity ?? 0);
  if (sort === "primary_release_date.asc") return (a.movie.release_date ?? "9999").localeCompare(b.movie.release_date ?? "9999");
  if (sort === "primary_release_date.desc") return (b.movie.release_date ?? "").localeCompare(a.movie.release_date ?? "");
  return (b.movie.popularity ?? 0) - (a.movie.popularity ?? 0);
}

function toMovie(movie: TmdbMovie, rating: number) {
  return {
    id: movie.id,
    title: movie.title,
    year: movie.release_date?.slice(0, 4) ?? "",
    poster: movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : "",
    overview: movie.overview ?? "",
    rating,
  };
}
