import type { ImdbRating } from "./imdb-rating.ts";

export type DiscoveryMovie = ImdbRating & { id: number; popularity?: number; releaseDate?: string };

export function compareMovies(a: DiscoveryMovie, b: DiscoveryMovie, sort: string) {
  if (sort === "imdb_rating.desc") {
    const first = a.ratingStatus === "rated" ? a.rating : null;
    const second = b.ratingStatus === "rated" ? b.rating : null;
    if (first === null && second !== null) return 1;
    if (second === null && first !== null) return -1;
    return (second ?? 0) - (first ?? 0) || (b.popularity ?? 0) - (a.popularity ?? 0) || a.id - b.id;
  }
  if (sort === "primary_release_date.asc") return (a.releaseDate || "9999").localeCompare(b.releaseDate || "9999") || a.id - b.id;
  if (sort === "primary_release_date.desc") return (b.releaseDate || "").localeCompare(a.releaseDate || "") || a.id - b.id;
  return (b.popularity ?? 0) - (a.popularity ?? 0) || a.id - b.id;
}

export function mergeMovieResults<T extends DiscoveryMovie>(previous: T[], incoming: T[], sort: string): T[] {
  return [...new Map([...previous, ...incoming].map((movie) => [movie.id, movie])).values()]
    .sort((a, b) => compareMovies(a, b, sort));
}

// Return every match in each scanned page. Slicing at a UI limit would skip overflow
// when continuing with the next source page.
export async function collectMovieResults<T extends { id: number }>({
  loadPage, rateMovie, minRating, startPage = 1, maxPages = 2, requireRatings = false,
}: {
  loadPage: (page: number) => Promise<{ movies: T[]; hasMore: boolean }>;
  rateMovie: (movie: T) => Promise<ImdbRating>;
  minRating: number | null;
  startPage?: number;
  maxPages?: number;
  requireRatings?: boolean;
}) {
  const movies: Array<T & ImdbRating> = [];
  const seen = new Set<number>();
  let page = startPage;
  let hasMore = true;
  let inspected = 0;
  let unavailable = 0;
  for (; hasMore && page < startPage + maxPages && page <= 500; page++) {
    const loaded = await loadPage(page);
    const unique = loaded.movies.filter((movie) => {
      if (seen.has(movie.id)) return false;
      seen.add(movie.id);
      return true;
    });
    const rated = await Promise.all(unique.map(async (movie) => ({ ...movie, ...await rateMovie(movie) })));
    inspected += rated.length;
    unavailable += rated.filter((movie) => movie.ratingStatus === "unavailable").length;
    movies.push(...rated.filter((movie) => minRating === null
      || (movie.ratingStatus === "rated" && movie.rating !== null && movie.rating >= minRating)));
    hasMore = loaded.hasMore;
  }
  if (inspected > 0 && unavailable === inspected && (requireRatings || minRating !== null)) {
    throw new Error("IMDb ratings could not be retrieved. Please retry this search shortly.");
  }
  return {
    movies, inspected, unavailable, pagesLoaded: page - startPage,
    nextPage: hasMore && page <= 500 ? page : null,
    sourceHasMore: hasMore,
    providerLimitReached: hasMore && page > 500,
  };
}
