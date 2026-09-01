export type RatedMovie<T> = { movie: T; rating: number };

type MoviePage<T> = {
  movies: T[];
  hasMore: boolean;
};

type CollectMovieResultsOptions<T> = {
  loadPage: (page: number) => Promise<MoviePage<T>>;
  rateMovie: (movie: T) => Promise<number>;
  onRateError?: (error: unknown, movie: T) => void;
  getMovieId: (movie: T) => number;
  minRating: number;
  compare: (first: RatedMovie<T>, second: RatedMovie<T>) => number;
  limit?: number;
  maxPages?: number;
  scanAllPages?: boolean;
  ratingConcurrency?: number;
};

export async function collectMovieResults<T>({
  loadPage,
  rateMovie,
  onRateError,
  getMovieId,
  minRating,
  compare,
  limit = 20,
  maxPages = 5,
  scanAllPages = false,
  ratingConcurrency = 6,
}: CollectMovieResultsOptions<T>) {
  const results: RatedMovie<T>[] = [];
  const seenMovieIds = new Set<number>();
  let pageNumber = 1;
  let hasMore = true;

  while (hasMore && pageNumber <= maxPages && (scanAllPages || results.length < limit)) {
    const page = await loadPage(pageNumber);
    const unseenMovies = page.movies.filter((movie) => {
      const id = getMovieId(movie);
      if (seenMovieIds.has(id)) return false;
      seenMovieIds.add(id);
      return true;
    });
    const qualifyingMovies: RatedMovie<T>[] = [];
    let nextMovieIndex = 0;
    const rateNextMovie = async () => {
      while (
        nextMovieIndex < unseenMovies.length
        && (scanAllPages || results.length + qualifyingMovies.length < limit)
      ) {
        const movie = unseenMovies[nextMovieIndex];
        nextMovieIndex += 1;
        try {
          const ratedMovie = { movie, rating: await rateMovie(movie) };
          if (!minRating || ratedMovie.rating >= minRating) qualifyingMovies.push(ratedMovie);
        } catch (error) {
          onRateError?.(error, movie);
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(ratingConcurrency, unseenMovies.length) }, () => rateNextMovie()),
    );

    results.push(...qualifyingMovies);
    hasMore = page.hasMore;
    pageNumber += 1;
  }

  return results
    .sort(compare)
    .slice(0, limit);
}
