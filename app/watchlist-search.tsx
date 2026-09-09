"use client";

import Image from "next/image";
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import type { HistoryMovie, Movie, WatchlistMember } from "@/app/watchlist-types";
import { ProfileAvatar } from "@/app/profile/avatar";

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

const EMPTY_FILTERS: SearchFilters = {
  genre: "",
  director: "",
  decade: "",
  minRating: "",
  sort: "popularity.desc",
};

type WatchlistSearchProps = {
  watchlistName: string;
  members: WatchlistMember[] | null;
  watchlist: Movie[];
  history: HistoryMovie[];
  inputRef: RefObject<HTMLInputElement | null>;
  onViewWatchlist: () => void;
  onAdd: (movie: Movie) => Promise<void>;
  onOpenDetails: (movie: Movie) => Promise<void>;
};

export function WatchlistSearch({ watchlistName, members, watchlist, history, inputRef, onAdd, onOpenDetails, onViewWatchlist }: WatchlistSearchProps) {
  const [visibleCount, setVisibleCount] = useState(4);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const searchRequest = useRef<AbortController | null>(null);
  const filterDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => () => searchRequest.current?.abort(), []);

  async function searchMovies(activeFilters = filters) {
    const trimmedQuery = query.trim();
    const hasFilters = Boolean(
      activeFilters.genre
      || activeFilters.director.trim()
      || activeFilters.decade
      || activeFilters.minRating
      || activeFilters.sort !== EMPTY_FILTERS.sort
    );

    if (!trimmedQuery && !hasFilters) {
      resetResults();
      return;
    }
    if (trimmedQuery.length === 1) {
      resetResults();
      setMessage("Type at least two characters.");
      return;
    }

    searchRequest.current?.abort();
    const request = new AbortController();
    searchRequest.current = request;
    setSearchAttempted(true);
    setSearchError(false);
    setLoading(true);
    setMessage("");

    try {
      const searchParams = new URLSearchParams({ query: trimmedQuery, ...activeFilters });
      const response = await fetch(`/api/movies?${searchParams}`, { signal: request.signal });
      const data = (await response.json()) as { movies?: Movie[]; error?: string; message?: string };
      if (!response.ok) throw new Error(data.error ?? "Film search is unavailable.");
      setResults(data.movies ?? []);
      setVisibleCount(4);
      setMessage(data.movies?.length ? (data.message ?? "") : (data.message || "No films found."));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setResults([]);
      setSearchError(true);
      setMessage(error instanceof Error ? error.message : "Film search is unavailable.");
    } finally {
      if (searchRequest.current === request) {
        searchRequest.current = null;
        setLoading(false);
      }
    }
  }

  function resetResults() {
    setResults([]);
    setMessage("");
    setSearchAttempted(false);
    setSearchError(false);
  }

  function clearSearch() {
    searchRequest.current?.abort();
    searchRequest.current = null;
    setQuery("");
    setLoading(false);
    resetResults();
    inputRef.current?.focus();
  }

  function updateFilter(name: keyof SearchFilters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    if (query.trim().length >= 2) void searchMovies(EMPTY_FILTERS);
    else resetResults();
  }

  const activeFilterCount = [
    filters.genre,
    filters.director.trim(),
    filters.decade,
    filters.minRating,
    filters.sort !== EMPTY_FILTERS.sort,
  ].filter(Boolean).length;

  const activeFilterChips = [
    filters.genre ? { name: "genre" as const, label: GENRES.find(([id]) => String(id) === filters.genre)?.[1] ?? "Genre" } : null,
    filters.director.trim() ? { name: "director" as const, label: `Director: ${filters.director.trim()}` } : null,
    filters.decade ? { name: "decade" as const, label: `${filters.decade}s` } : null,
    filters.minRating ? { name: "minRating" as const, label: `${filters.minRating}+ TMDb` } : null,
    filters.sort !== EMPTY_FILTERS.sort ? { name: "sort" as const, label: sortLabel(filters.sort) } : null,
  ].filter((item): item is { name: keyof SearchFilters; label: string } => Boolean(item));

  function removeFilter(name: keyof SearchFilters) {
    const nextFilters = { ...filters, [name]: name === "sort" ? EMPTY_FILTERS.sort : "" };
    setFilters(nextFilters);
    void searchMovies(nextFilters);
  }

  return (
    <section className="search-panel" aria-labelledby="add-film-heading" aria-busy={loading}>
      <div className="discovery-context">
        <div><strong>{watchlistName}</strong><p>Private{members ? ` · ${members.length} ${members.length === 1 ? "Member" : "Members"}` : ""}</p></div>
        {members ? <ul className="discovery-members" aria-label="Watchlist members">
          {members.slice(0, 4).map((member) => <li key={member.profile.userId} title={member.profile.displayName}><ProfileAvatar displayName={member.profile.displayName} small /><span className="sr-only">{member.profile.displayName}</span></li>)}
          {members.length > 4 ? <li>+{members.length - 4}<span className="sr-only"> more Members</span></li> : null}
        </ul> : null}
      </div>
      <h2 id="add-film-heading">Add a film</h2>
      <label className="sr-only" htmlFor="film-search">Search by title</label>
      <form className="search-row" onSubmit={(event) => { event.preventDefault(); void searchMovies(); }}>
        <div className="search-input-wrap">
          <input
            ref={inputRef}
            id="film-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by film title"
            autoComplete="off"
            enterKeyHint="search"
          />
          {query ? <button className="clear-search" type="button" onClick={clearSearch} aria-label="Clear search">×</button> : null}
        </div>
        <button type="submit" disabled={loading}>{loading ? "Searching…" : "Search"}</button>
      </form>

      <details className="advanced-search desktop-advanced-search">
        <summary>
          <span>Advanced search</span>
          {activeFilterCount ? <span className="filter-count">{activeFilterCount}</span> : null}
        </summary>
        <FilterFields filters={filters} updateFilter={updateFilter} />
        <div className="advanced-actions">
          <button type="button" className="filter-search-button" onClick={() => void searchMovies()} disabled={loading}>Apply filters</button>
          {activeFilterCount ? <button type="button" className="reset-filters" onClick={resetFilters}>Reset</button> : null}
        </div>
      </details>

      <button className="mobile-filter-button" type="button" onClick={() => filterDialog.current?.showModal()}>
        <FilterIcon />
        <span>Filters</span>
        {activeFilterCount ? <span className="filter-count">{activeFilterCount}</span> : null}
      </button>

      <dialog className="filter-dialog" ref={filterDialog} aria-labelledby="filter-dialog-title">
        <button className="dialog-close" type="button" onClick={() => filterDialog.current?.close()} aria-label="Close filters">×</button>
        <div className="filter-dialog-content">
          <header className="details-heading">
            <p>Discovery</p>
            <h2 id="filter-dialog-title">Filter films</h2>
            <p className="tagline">Narrow the results without losing your place.</p>
          </header>
          <FilterFields filters={filters} updateFilter={updateFilter} />
          <div className="advanced-actions">
            <button
              type="button"
              className="filter-search-button"
              disabled={loading}
              onClick={() => {
                filterDialog.current?.close();
                void searchMovies();
              }}
            >
              Apply filters
            </button>
            {activeFilterCount ? <button type="button" className="reset-filters" onClick={resetFilters}>Reset</button> : null}
          </div>
        </div>
      </dialog>

      {activeFilterChips.length ? (
        <div className="active-filter-chips" aria-label="Active filters">
          {activeFilterChips.map((filter) => (
            <button type="button" key={filter.name} onClick={() => removeFilter(filter.name)} aria-label={`Remove ${filter.label} filter`}>
              {filter.label}<span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : null}

      {message && !loading ? <p className="status" role="status">{message}</p> : null}
      {loading || results.length || searchAttempted ? (
        <div className="results-block">
          <div className="results-heading"><h3>Search results</h3>{results.length ? <span aria-live="polite">{Math.min(visibleCount, results.length)} of {results.length} found</span> : null}</div>
          {loading ? <SearchSkeleton /> : results.length ? (
            <ul className="search-results" aria-label="Film search results">
              {results.slice(0, visibleCount).map((movie) => {
                const added = watchlist.some((item) => item.id === movie.id);
                const watched = history.some((item) => item.id === movie.id);
                return (
                  <li className="group" key={movie.id}>
                    <button className="result-details-trigger" type="button" onClick={() => void onOpenDetails(movie)} aria-haspopup="dialog" aria-label={`View details for ${movie.title}`}>
                      <SearchPoster movie={movie} />
                      <span className="result-info">
                        <strong title={movie.title}>{movie.title}</strong>
                        <span>{movie.year || "Year unknown"} · TMDb {formatRating(movie.rating)}</span>
                      </span>
                    </button>
                    <div className="result-actions">
                      <button type="button" onClick={() => void onAdd(movie)} disabled={added || watched}>
                        {watched ? "Watched" : added ? "Added" : "Add"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={`search-empty${searchError ? " search-empty-error" : ""}`} role={searchError ? "alert" : "status"}>
              <span className="empty-state-icon" aria-hidden="true">{searchError ? "!" : "⌕"}</span>
              <strong>{searchError ? "Search unavailable" : "No films found"}</strong>
              <span>{searchError ? message : "Try a different title or loosen your filters."}</span>
            </div>
          )}
        </div>
      ) : null}
      {!loading && results.length > visibleCount ? <button className="show-more-results" type="button" onClick={() => setVisibleCount((count) => count + 4)}>Show more films</button> : null}
      <div className="watchlist-bridge">
        <span>{watchlistName}</span>
        <button type="button" onClick={onViewWatchlist}>View Watchlist ({watchlist.length})</button>
      </div>
    </section>
  );
}

function FilterFields({ filters, updateFilter }: { filters: SearchFilters; updateFilter: (name: keyof SearchFilters, value: string) => void }) {
  return (
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
          <option value="6">6+ on TMDb</option>
          <option value="7">7+ on TMDb</option>
          <option value="8">8+ on TMDb</option>
        </select>
      </label>
      <label>
        <span>Sort by</span>
        <select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}>
          <option value="popularity.desc">Most popular</option>
          <option value="vote_average.desc">Highest rated</option>
          <option value="primary_release_date.desc">Newest first</option>
          <option value="primary_release_date.asc">Oldest first</option>
        </select>
      </label>
    </div>
  );
}

function sortLabel(sort: string) {
  if (sort === "vote_average.desc") return "Highest rated";
  if (sort === "primary_release_date.desc") return "Newest first";
  if (sort === "primary_release_date.asc") return "Oldest first";
  return "Most popular";
}

function FilterIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>;
}

function SearchPoster({ movie }: { movie: Movie }) {
  if (!movie.poster) return <span className="poster-placeholder poster-card" aria-label="No poster available">No poster</span>;
  return <Image className="poster poster-card" src={movie.poster} alt={`${movie.title} poster`} width={342} height={513} sizes="(max-width: 430px) 104px, (max-width: 700px) 50vw, 25vw" />;
}

function SearchSkeleton() {
  return (
    <ul className="search-results film-grid-skeleton" aria-label="Loading film results">
      {Array.from({ length: 5 }, (_, index) => <li className="skeleton-card" key={index}><span className="skeleton-poster" /><span className="skeleton-lines"><i /><i /></span></li>)}
    </ul>
  );
}

function formatRating(rating: number) {
  return rating ? rating.toFixed(1) : "N/A";
}
