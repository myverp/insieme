"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { logout } from "@/app/auth/actions";
import { InsiemeLogo } from "@/app/logo";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type Movie = {
  id: number;
  title: string;
  year: string;
  poster: string;
  overview: string;
  rating: number;
};

type HistoryMovie = Movie & { watchedAt: string };

type Review = {
  id: string;
  text: string;
  rating: number | null;
  own: boolean;
  createdAt: string;
  updatedAt: string;
};

type MovieDetails = {
  id: number;
  title: string;
  tagline: string;
  overview: string;
  releaseDate: string;
  runtime: number;
  rating: number;
  genres: string[];
  countries: string[];
  director: string;
  cast: string[];
  backdrops: string[];
  trailer: { key: string; name: string } | null;
};

const STORAGE_KEY = "insieme-simple-watchlist-v1";
const SEARCH_PLACEHOLDERS = [
  "сьогодні настрій подивитись ромкомчіки?",
  "а якщо щось аби поностальгувати...",
  "ромка любить тебе, до речі",
  "а може старих добрих друзів??",
  "сьогодні дивимось фільм про нас, the beauty and the beast",
  "комедії не вистачає в нашому житті!!!!",
  "як щодо драми? :)",
] as const;

const GENRES = [
  [28, "Action"], [12, "Adventure"], [16, "Animation"], [35, "Comedy"], [80, "Crime"],
  [99, "Documentary"], [18, "Drama"], [10751, "Family"], [14, "Fantasy"], [36, "History"],
  [27, "Horror"], [10402, "Music"], [9648, "Mystery"], [10749, "Romance"], [878, "Science fiction"],
  [53, "Thriller"], [10752, "War"], [37, "Western"],
] as const;

type SearchFilters = {
  genre: string;
  director: string;
  decade: string;
  minRating: string;
  sort: string;
};

const EMPTY_FILTERS: SearchFilters = { genre: "", director: "", decade: "", minRating: "", sort: "popularity.desc" };

type WatchlistSummary = { id: string; name: string };

export default function Watchlist({ watchlists, watchlistId, joined }: { watchlists: WatchlistSummary[]; watchlistId: string; joined: boolean }) {
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [history, setHistory] = useState<HistoryMovie[]>([]);
  const [results, setResults] = useState<Movie[]>([]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchPlaceholder, setSearchPlaceholder] = useState<string>(SEARCH_PLACEHOLDERS[0]);
  const [ready, setReady] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [listAction, setListAction] = useState<"switch" | "create" | "invite" | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailsDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSearchPlaceholder(SEARCH_PLACEHOLDERS[Math.floor(Math.random() * SEARCH_PLACEHOLDERS.length)]);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (joined) toast.success("You joined the Watchlist.");
  }, [joined]);

  const refreshWatchlist = useCallback(async () => {
    const response = await fetch(`/api/watchlist?selected=${encodeURIComponent(watchlistId)}`, { cache: "no-store" });
    const data = (await response.json()) as { movies?: Movie[]; history?: HistoryMovie[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "The shared watchlist is unavailable.");
    setWatchlist(data.movies ?? []);
    setHistory(data.history ?? []);
    return { movies: data.movies ?? [], history: data.history ?? [] };
  }, [watchlistId]);

  useEffect(() => {
    let cancelled = false;

    async function loadSharedWatchlist() {
      try {
        const sharedState = await refreshWatchlist();
        if (cancelled) return;

        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const localMovies = JSON.parse(saved) as Movie[];
            if (Array.isArray(localMovies) && localMovies.length) {
              const sharedIds = new Set([...sharedState.movies, ...sharedState.history].map((movie) => movie.id));
              await Promise.all(localMovies.filter((movie) => !sharedIds.has(movie.id)).map((movie) => saveMovie(movie)));
              if (!cancelled) await refreshWatchlist();
            }
          } catch {
            // Ignore malformed legacy device data and continue with the shared list.
          }
        }
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "The shared watchlist is unavailable.");
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void loadSharedWatchlist();
    return () => { cancelled = true; };
  }, [refreshWatchlist]);

  useEffect(() => {
    if (!ready) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`insieme-watchlist-${watchlistId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "watchlist_movies", filter: `watchlist_id=eq.${watchlistId}` }, () => {
        void refreshWatchlist().catch(() => undefined);
      })
      .subscribe();

    const refreshOnFocus = () => void refreshWatchlist().catch(() => undefined);
    const fallbackTimer = window.setInterval(refreshOnFocus, 30000);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.clearInterval(fallbackTimer);
      window.removeEventListener("focus", refreshOnFocus);
      void supabase.removeChannel(channel);
    };
  }, [ready, refreshWatchlist, watchlistId]);

  async function selectList(id: string) {
    if (id === watchlistId) return;
    setListAction("switch");
    try {
      const response = await fetch("/api/watchlists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("The Watchlist could not be selected.");
      router.refresh();
      setListAction(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The Watchlist could not be selected.");
      setListAction(null);
    }
  }

  async function createList() {
    const name = window.prompt("Name your new Watchlist", "We two");
    if (!name?.trim()) return;
    setListAction("create");
    try {
      const response = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The Watchlist could not be created.");
      router.refresh();
      setListAction(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The Watchlist could not be created.");
      setListAction(null);
    }
  }

  async function copyInvitation() {
    setListAction("invite");
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watchlistId }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "The invitation link could not be created.");
      await navigator.clipboard.writeText(data.url);
      toast.success("Invitation link copied.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The invitation link could not be copied.");
    } finally {
      setListAction(null);
    }
  }

  async function searchMovies(value: string, activeFilters = filters) {
    const trimmedValue = value.trim();
    const hasFilters = Boolean(
      activeFilters.genre
      || activeFilters.director.trim()
      || activeFilters.decade
      || activeFilters.minRating
      || activeFilters.sort !== EMPTY_FILTERS.sort
    );
    if (!trimmedValue && !hasFilters) {
      setResults([]);
      setMessage("");
      return;
    }

    if (trimmedValue.length === 1) {
      setResults([]);
      setMessage("Type at least two characters.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const searchParams = new URLSearchParams({ query: trimmedValue, ...activeFilters });
      const response = await fetch(`/api/movies?${searchParams}`);
      const data = (await response.json()) as { movies?: Movie[]; error?: string; message?: string };
      if (!response.ok) throw new Error(data.error ?? "Film search is unavailable.");
      setResults(data.movies ?? []);
      setMessage(data.movies?.length ? (data.message ?? "") : (data.message || "No films found."));
    } catch (error) {
      setResults([]);
      setMessage(error instanceof Error ? error.message : "Film search is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void searchMovies(value), 350);
  }

  function updateFilter(name: keyof SearchFilters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    if (query.trim().length >= 2) void searchMovies(query, EMPTY_FILTERS);
    else {
      setResults([]);
      setMessage("");
    }
  }

  const activeFilterCount = [
    filters.genre,
    filters.director.trim(),
    filters.decade,
    filters.minRating,
    filters.sort !== EMPTY_FILTERS.sort,
  ].filter(Boolean).length;

  async function addMovie(movie: Movie) {
    const alreadyAdded = watchlist.some((item) => item.id === movie.id) || history.some((item) => item.id === movie.id);
    if (alreadyAdded) return;

    setWatchlist((current) => [...current, movie]);
    try {
      await saveMovie(movie);
      toast.success(`Added “${movie.title}” to our list ♡`);
    } catch (error) {
      setWatchlist((current) => current.filter((item) => item.id !== movie.id));
      const errorMessage = error instanceof Error ? error.message : "The film could not be added.";
      setMessage(errorMessage);
      toast.error(errorMessage);
    }
  }

  async function markWatched(movie: Movie) {
    setWatchlist((current) => current.filter((item) => item.id !== movie.id));
    try {
      const watchedAt = await markMovieWatched(movie.id);
      setHistory((current) => [{ ...movie, watchedAt }, ...current.filter((item) => item.id !== movie.id)]);
      toast.success(`Marked “${movie.title}” as watched ♡`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "The film could not be marked as watched.";
      setMessage(errorMessage);
      toast.error(errorMessage);
      void refreshWatchlist().catch(() => undefined);
    }
  }

  function removeMovie(movie: Movie) {
    const originalIndex = watchlist.findIndex((item) => item.id === movie.id);
    if (originalIndex < 0) return;

    let undoRequested = false;
    setWatchlist((current) => current.filter((item) => item.id !== movie.id));
    const removalRequest = deleteMovie(movie.id);

    toast(`Removed “${movie.title}”`, {
      description: "Changed your mind? Put it back on the shared list.",
      action: {
        label: "Undo",
        onClick: () => {
          undoRequested = true;
          void restoreMovie(movie, originalIndex, removalRequest);
        },
      },
    });

    void removalRequest.catch((error: unknown) => {
      if (undoRequested) return;
      const errorMessage = error instanceof Error ? error.message : "The film could not be removed.";
      setMessage(errorMessage);
      toast.error(errorMessage);
      void refreshWatchlist().catch(() => undefined);
    });
  }

  async function restoreMovie(movie: Movie, originalIndex: number, removalRequest: Promise<void>) {
    try {
      await removalRequest;
    } catch {
      void refreshWatchlist().catch(() => undefined);
      return;
    }

    try {
      await saveMovie(movie);
      setWatchlist((current) => {
        if (current.some((item) => item.id === movie.id)) return current;
        const restored = [...current];
        restored.splice(Math.min(originalIndex, restored.length), 0, movie);
        return restored;
      });
      toast.success(`“${movie.title}” is back on the list ♡`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "The film could not be restored.";
      setMessage(errorMessage);
      toast.error(errorMessage);
      void refreshWatchlist().catch(() => undefined);
    }
  }

  async function openDetails(movie: Movie) {
    const isWatched = history.some((item) => item.id === movie.id);
    setSelectedMovie(movie);
    setDetails(null);
    setDetailsError("");
    setDetailsLoading(true);
    setReviews([]);
    setReviewsError("");
    setReviewText("");
    setReviewRating("");
    detailsDialog.current?.showModal();

    if (isWatched) void loadReviews(movie.id);

    try {
      const response = await fetch(`/api/movies/${movie.id}`);
      const data = (await response.json()) as { details?: MovieDetails; error?: string };
      if (!response.ok || !data.details) throw new Error(data.error ?? "Film details are unavailable.");
      setDetails(data.details);
    } catch (error) {
      setDetailsError(error instanceof Error ? error.message : "Film details are unavailable.");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function loadReviews(filmId: number) {
    setReviewsLoading(true);
    setReviewsError("");
    try {
      const response = await fetch(`/api/reviews?filmId=${filmId}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        reviews?: Review[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Reviews are unavailable.");
      }

      const nextReviews = data.reviews ?? [];
      const ownReview = nextReviews.find((review) => review.own);
      setReviews(nextReviews);
      setReviewText(ownReview?.text ?? "");
      setReviewRating(ownReview?.rating?.toString() ?? "");
    } catch (error) {
      setReviewsError(
        error instanceof Error ? error.message : "Reviews are unavailable.",
      );
    } finally {
      setReviewsLoading(false);
    }
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMovie || !reviewText.trim()) return;

    const ownReview = reviews.find((review) => review.own);
    setReviewSaving(true);
    setReviewsError("");
    try {
      const response = await fetch(`/api/reviews?filmId=${selectedMovie.id}`, {
        method: ownReview ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: reviewText,
          rating: reviewRating ? Number(reviewRating) : null,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "The review could not be saved.");
      }
      await loadReviews(selectedMovie.id);
      toast.success(ownReview ? "Review updated." : "Review added.");
    } catch (error) {
      setReviewsError(
        error instanceof Error
          ? error.message
          : "The review could not be saved.",
      );
    } finally {
      setReviewSaving(false);
    }
  }

  async function deleteReview() {
    if (!selectedMovie) return;
    if (!window.confirm("Delete your review?")) return;
    setReviewSaving(true);
    setReviewsError("");
    try {
      const response = await fetch(`/api/reviews?filmId=${selectedMovie.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "The review could not be deleted.");
      }
      await loadReviews(selectedMovie.id);
      toast.success("Review deleted.");
    } catch (error) {
      setReviewsError(
        error instanceof Error
          ? error.message
          : "The review could not be deleted.",
      );
    } finally {
      setReviewSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="simple-header">
        <h1><InsiemeLogo /></h1>
        <div className="header-actions">
          <label className="sr-only" htmlFor="watchlist-selector">Current Watchlist</label>
          <select
            id="watchlist-selector"
            value={watchlistId}
            onChange={(event) => void selectList(event.target.value)}
            disabled={listAction !== null}
          >
            {watchlists.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <button type="button" onClick={() => void createList()} disabled={listAction !== null}>New list</button>
          <button type="button" onClick={() => void copyInvitation()} disabled={listAction !== null}>
            {listAction === "invite" ? "Copying…" : "Invite"}
          </button>
          <form action={logout} className="logout-form">
            <button type="submit">Log out</button>
          </form>
        </div>
      </header>

      <section className="search-panel" aria-labelledby="add-film-heading">
        <h2 id="add-film-heading">Додать фільмец</h2>
        <label className="sr-only" htmlFor="film-search">Search by title</label>
        <div className="search-row">
          <input
            id="film-search"
            type="search"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
            autoComplete="off"
          />
          <button type="button" onClick={() => void searchMovies(query)} disabled={loading}>
            {loading ? "Searching…" : "ricerca!"}
          </button>
        </div>

        <details className="advanced-search">
          <summary>
            <span>Advanced search</span>
            {activeFilterCount ? <span className="filter-count">{activeFilterCount}</span> : null}
          </summary>
          <div className="advanced-fields">
            <label>
              <span>Genre</span>
              <select value={filters.genre} onChange={(event) => updateFilter("genre", event.target.value)}>
                <option value="">Any genre</option>
                {GENRES.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
              </select>
            </label>
            <label>
              <span>Director</span>
              <input type="text" value={filters.director} onChange={(event) => updateFilter("director", event.target.value)} placeholder="For example: Sofia Coppola" />
            </label>
            <label>
              <span>Decade</span>
              <select value={filters.decade} onChange={(event) => updateFilter("decade", event.target.value)}>
                <option value="">Any decade</option>
                {[2020, 2010, 2000, 1990, 1980, 1970, 1960, 1950, 1940, 1930, 1920].map((decade) => <option value={decade} key={decade}>{decade}s</option>)}
              </select>
            </label>
            <label>
              <span>Minimum rating</span>
              <select value={filters.minRating} onChange={(event) => updateFilter("minRating", event.target.value)}>
                <option value="">Any rating</option>
                <option value="6">6+ on IMDb</option>
                <option value="7">7+ on IMDb</option>
                <option value="8">8+ on IMDb</option>
              </select>
            </label>
            <label>
              <span>Sort by</span>
              <select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}>
                <option value="popularity.desc">Most popular</option>
                <option value="imdb_rating.desc">Highest rated</option>
                <option value="primary_release_date.desc">Newest first</option>
                <option value="primary_release_date.asc">Oldest first</option>
              </select>
            </label>
          </div>
          <div className="advanced-actions">
            <button type="button" className="filter-search-button" onClick={() => void searchMovies(query)} disabled={loading}>Apply filters</button>
            {activeFilterCount ? <button type="button" className="reset-filters" onClick={resetFilters}>Reset</button> : null}
          </div>
        </details>

        {message ? <p className="status" role="status">{message}</p> : null}

        {results.length ? (
          <div className="results-block">
            <h3>Search results</h3>
            <ul className="search-results" aria-label="Film search results">
              <AnimatePresence initial={false} mode="popLayout">
                {results.map((movie) => {
                  const added = watchlist.some((item) => item.id === movie.id);
                  const watched = history.some((item) => item.id === movie.id);
                  return (
                    <motion.li
                      className="group"
                      key={movie.id}
                      layout={!shouldReduceMotion}
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
                      transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                    >
                  <button
                    className="result-details-trigger"
                    type="button"
                    onClick={() => void openDetails(movie)}
                    aria-haspopup="dialog"
                    aria-label={`View details for ${movie.title}`}
                  >
                    <Poster movie={movie} size="card" />
                    <span className="result-info">
                      <strong title={movie.title}>{movie.title}</strong>
                      <span>{movie.year || "Year unknown"} · IMDb {formatRating(movie.rating)}</span>
                    </span>
                  </button>
                  <div className="result-actions">
                    <button type="button" onClick={() => void addMovie(movie)} disabled={added || watched}>
                      {watched ? "Watched" : added ? "Added" : "Add"}
                    </button>
                  </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </div>
        ) : null}
      </section>

      <section className="list-section" aria-labelledby="watchlist-heading">
        <div className="list-heading">
          <h2 id="watchlist-heading">Список до перегляду!!</h2>
        </div>

        {!ready ? (
          <p className="empty-list" role="status">Loading our shared list…</p>
        ) : watchlist.length ? (
          <ul className="film-grid">
            <AnimatePresence initial={false} mode="popLayout">
              {watchlist.map((movie) => (
                <motion.li
                  className="group"
                  key={movie.id}
                  layout={!shouldReduceMotion}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 18, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0, y: 18, scale: 0.92 }}
                  whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                  transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                >
                  <button
                    className="film-details-trigger"
                    type="button"
                    onClick={() => void openDetails(movie)}
                    aria-haspopup="dialog"
                    aria-label={`View details for ${movie.title}`}
                  >
                    <Poster movie={movie} size="card" />
                    <span className="film-info">
                      <span className="film-title" title={movie.title}>{movie.title}</span>
                      <span className="film-meta">{movie.year || "Year unknown"} · IMDb {formatRating(movie.rating)}</span>
                      {movie.overview ? <span className="overview">{movie.overview}</span> : null}
                    </span>
                  </button>
                  <div className="film-actions">
                    <button
                      className="watched-button"
                      type="button"
                      onClick={() => void markWatched(movie)}
                    >
                      Watched
                    </button>
                    <button
                      className="remove-button"
                      type="button"
                      onClick={() => removeMovie(movie)}
                      aria-label={`Remove ${movie.title}`}
                      title={`Remove ${movie.title}`}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <p className="empty-list">Your list is empty. Search for a film above and press Add.</p>
        )}
      </section>

      <section className="list-section history-section" aria-labelledby="history-heading">
        <div className="list-heading">
          <h2 id="history-heading">Історія переглядіііів!&lt;3</h2>
        </div>

        {history.length ? (
          <ul className="film-grid history-grid">
            <AnimatePresence initial={false} mode="popLayout">
              {history.map((movie) => (
                <motion.li
                  className="group history-card"
                  key={movie.id}
                  layout={!shouldReduceMotion}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 18, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                >
                  <button
                    className="film-details-trigger"
                    type="button"
                    onClick={() => void openDetails(movie)}
                    aria-haspopup="dialog"
                    aria-label={`View details for ${movie.title}`}
                  >
                    <Poster movie={movie} size="card" />
                    <span className="film-info">
                      <span className="film-title" title={movie.title}>{movie.title}</span>
                      <span className="film-meta">Watched {formatWatchedDate(movie.watchedAt)}</span>
                      {movie.overview ? <span className="overview">{movie.overview}</span> : null}
                    </span>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <p className="empty-list">Films marked as watched will appear here.</p>
        )}
      </section>

      <footer className="tmdb-footer">
        <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" aria-label="Visit The Movie Database">
          <Image
            src="https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
            alt="The Movie Database (TMDB)"
            width={300}
            height={39}
          />
        </a>
        <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </footer>

      <dialog
        className="details-dialog"
        ref={detailsDialog}
        aria-labelledby="details-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") detailsDialog.current?.close();
        }}
      >
        <button className="dialog-close" type="button" onClick={() => detailsDialog.current?.close()} aria-label="Close film details">×</button>
        {selectedMovie ? (
          <div className="details-content">
            <header className="details-heading">
              <p>Film details</p>
              <h2 id="details-title">{selectedMovie.title}</h2>
              {details?.tagline ? <p className="tagline">{details.tagline}</p> : null}
            </header>

            {detailsLoading ? <p className="details-state" role="status">Loading details…</p> : null}
            {detailsError ? <p className="details-state details-error" role="alert">{detailsError}</p> : null}

            {details ? (
              <>
                <dl className="details-facts">
                  {details.releaseDate ? <div><dt>Released</dt><dd>{formatDate(details.releaseDate)}</dd></div> : null}
                  {details.runtime ? <div><dt>Runtime</dt><dd>{formatRuntime(details.runtime)}</dd></div> : null}
                  {details.rating ? <div><dt>IMDb rating</dt><dd>{details.rating.toFixed(1)} / 10</dd></div> : null}
                  {details.director ? <div><dt>Director</dt><dd>{details.director}</dd></div> : null}
                </dl>

                {details.genres.length ? <p className="genre-list" aria-label="Genres">{details.genres.map((genre) => <span key={genre}>{genre}</span>)}</p> : null}

                <section className="details-section">
                  <h3>Story</h3>
                  <p>{details.overview || selectedMovie.overview || "No description is available."}</p>
                </section>

                {details.cast.length ? (
                  <section className="details-section">
                    <h3>Cast</h3>
                    <p>{details.cast.join(", ")}</p>
                  </section>
                ) : null}

                {details.countries.length ? (
                  <section className="details-section details-countries">
                    <h3>Production</h3>
                    <p>{details.countries.join(", ")}</p>
                  </section>
                ) : null}

                {details.backdrops.length ? (
                  <section className="details-section">
                    <h3>Stills</h3>
                    <div className="stills-grid">
                      {details.backdrops.map((still, index) => (
                        <Image key={still} src={still} alt={`Still ${index + 1} from ${details.title}`} width={780} height={439} sizes="(max-width: 700px) 88vw, 360px" />
                      ))}
                    </div>
                  </section>
                ) : null}

                {details.trailer ? (
                  <section className="details-section">
                    <h3>Trailer</h3>
                    <div className="trailer-frame">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${details.trailer.key}`}
                        title={`${details.title}: ${details.trailer.name}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  </section>
                ) : (
                  <p className="trailer-unavailable">No trailer is available for this film.</p>
                )}
              </>
            ) : null}

            {history.some((movie) => movie.id === selectedMovie.id) ? (
              <section className="details-section reviews-section" aria-labelledby="reviews-title">
                <h3 id="reviews-title">Reviews</h3>

                {reviewsLoading ? (
                  <p className="reviews-state" role="status">Loading reviews…</p>
                ) : null}
                {reviewsError ? (
                  <p className="reviews-state reviews-error" role="alert">{reviewsError}</p>
                ) : null}

                <div className="reviews-list">
                  {reviews.filter((review) => !review.own).map((review) => (
                    <article className="review-card" key={review.id}>
                      <div className="review-card-heading">
                        <strong>Watchlist member</strong>
                        {review.rating ? <span>{review.rating} / 10</span> : null}
                      </div>
                      <p>{review.text}</p>
                    </article>
                  ))}
                  {!reviewsLoading && !reviews.some((review) => !review.own) ? (
                    <p className="reviews-empty">No reviews from other members yet.</p>
                  ) : null}
                </div>

                <form className="review-form" onSubmit={saveReview}>
                  <label htmlFor="review-text">Your review</label>
                  <textarea
                    id="review-text"
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                    maxLength={5000}
                    required
                    disabled={reviewSaving || reviewsLoading}
                    placeholder="What did you think?"
                  />

                  <label htmlFor="review-rating">Rating <span>(optional)</span></label>
                  <select
                    id="review-rating"
                    value={reviewRating}
                    onChange={(event) => setReviewRating(event.target.value)}
                    disabled={reviewSaving || reviewsLoading}
                  >
                    <option value="">No rating</option>
                    {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => (
                      <option key={rating} value={rating}>{rating} / 10</option>
                    ))}
                  </select>

                  <div className="review-actions">
                    <button
                      type="submit"
                      disabled={reviewSaving || reviewsLoading || !reviewText.trim()}
                    >
                      {reviewSaving ? "Saving…" : reviews.some((review) => review.own) ? "Update review" : "Add review"}
                    </button>
                    {reviews.some((review) => review.own) ? (
                      <button
                        className="review-delete"
                        type="button"
                        onClick={() => void deleteReview()}
                        disabled={reviewSaving || reviewsLoading}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </form>
              </section>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </main>
  );
}

function formatRating(rating: number) {
  return rating ? rating.toFixed(1) : "N/A";
}

function formatRuntime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`;
}

async function saveMovie(movie: Movie) {
  const response = await fetch("/api/watchlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(movie),
  });
  const data = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(data.error ?? "The film could not be added.");
}

async function deleteMovie(id: number) {
  const response = await fetch(`/api/watchlist?id=${id}`, { method: "DELETE" });
  const data = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(data.error ?? "The film could not be removed.");
}

async function markMovieWatched(id: number) {
  const response = await fetch(`/api/watchlist?id=${id}`, { method: "PATCH" });
  const data = (await response.json()) as { watchedAt?: string; error?: string };
  if (!response.ok || !data.watchedAt) throw new Error(data.error ?? "The film could not be marked as watched.");
  return data.watchedAt;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function formatWatchedDate(date: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
    </svg>
  );
}

function Poster({ movie, size }: { movie: Movie; size: "card" }) {
  const dimensions = { width: 342, height: 513 };
  if (!movie.poster) {
    return <span className={`poster-placeholder poster-${size}`} aria-label="No poster available">No poster</span>;
  }

  return (
    <Image
      className={`poster poster-${size} transition-transform duration-500 group-hover:scale-[1.015]`}
      src={movie.poster}
      alt={`${movie.title} poster`}
      width={dimensions.width}
      height={dimensions.height}
    />
  );
}
