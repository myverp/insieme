type MoviePage<T> = {
  movies: T[];
  hasMore: boolean;
};

type CollectMovieResultsOptions<T> = {
  loadPage: (page: number) => Promise<MoviePage<T>>;
  acceptMovie: (movie: T) => boolean;
  getMovieId: (movie: T) => number;
  compare: (first: T, second: T) => number;
  limit?: number;
  maxPages?: number;
  scanAllPages?: boolean;
};

export async function collectMovieResults<T>({
  loadPage,
  acceptMovie,
  getMovieId,
  compare,
  limit = 20,
  maxPages = 5,
  scanAllPages = false,
}: CollectMovieResultsOptions<T>) {
  const results: T[] = [];
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
    results.push(...unseenMovies.filter(acceptMovie));
    hasMore = page.hasMore;
    pageNumber += 1;
  }

  return results
    .sort(compare)
    .slice(0, limit);
}
