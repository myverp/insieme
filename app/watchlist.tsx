"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { InsiemeLogo } from "@/app/logo";
import { ProfileAvatar, type Profile } from "@/app/profile/avatar";
import { WatchlistSearch } from "@/app/watchlist-search";
import type { HistoryMovie, Movie, MovieDetails, Review, WatchlistMember, WatchlistSummary } from "@/app/watchlist-types";
import { toast } from "sonner";
import type { FormEvent } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

const STORAGE_KEY = "insieme-simple-watchlist-v1";

export default function Watchlist({ watchlists, watchlistId, joined, profile }: { watchlists: WatchlistSummary[]; watchlistId: string; joined: boolean; profile: Profile }) {
  const router = useRouter();
  const currentWatchlist = watchlists.find((item) => item.id === watchlistId) ?? watchlists[0];
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [history, setHistory] = useState<HistoryMovie[]>([]);
  const [ready, setReady] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState<number | null>(null);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [members, setMembers] = useState<WatchlistMember[]>([{ profile, role: currentWatchlist?.role ?? "owner" }]);
  const [membersLoadedFor, setMembersLoadedFor] = useState<string | null>(null);
  const [listAction, setListAction] = useState<"switch" | "create" | "invite" | "rename" | "lifecycle" | null>(null);
  const [newListName, setNewListName] = useState("");
  const [renameListName, setRenameListName] = useState(currentWatchlist?.name ?? "");
  const [legacyMovies, setLegacyMovies] = useState<Movie[]>([]);
  const [legacyImporting, setLegacyImporting] = useState(false);
  const [watchlistOpen, setWatchlistOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const detailsDialog = useRef<HTMLDialogElement>(null);
  const managerDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (joined) toast.success("You joined the Watchlist.");
  }, [joined]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/profiles", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { members?: WatchlistMember[] };
        if (response.ok && data.members && !cancelled) {
          setMembers(data.members);
          setMembersLoadedFor(watchlistId);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Watchlist members could not be refreshed.", { id: "member-refresh" });
      });
    return () => { cancelled = true; };
  }, [currentWatchlist?.role, profile, watchlistId]);

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
              const missingMovies = localMovies
                .filter((movie) => !sharedIds.has(movie.id))
                .map((movie) => ({ ...movie, ratingSource: "legacy" as const }));
              if (!cancelled) setLegacyMovies(missingMovies);
            }
          } catch {
            // Ignore malformed legacy device data and continue with the shared list.
          }
        }
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "The shared watchlist is unavailable.");
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
        void refreshWatchlist().catch(() => {
          toast.error("The Watchlist could not be refreshed.", { id: "watchlist-refresh" });
        });
      })
      .subscribe();

    const refreshOnFocus = () => void refreshWatchlist().catch(() => {
      toast.error("The Watchlist could not be refreshed.", { id: "watchlist-refresh" });
    });
    window.addEventListener("focus", refreshOnFocus);

    return () => {
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
      managerDialog.current?.close();
      router.refresh();
      setListAction(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The Watchlist could not be selected.");
      setListAction(null);
    }
  }

  async function createList(name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setListAction("create");
    try {
      const response = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The Watchlist could not be created.");
      setNewListName("");
      managerDialog.current?.close();
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

  function openManager() {
    setRenameListName(currentWatchlist?.name ?? "");
    if (!managerDialog.current?.open) managerDialog.current?.showModal();
  }

  async function renameList(name: string) {
    const trimmedName = name.trim();
    if (!currentWatchlist || currentWatchlist.role !== "owner" || !trimmedName || trimmedName === currentWatchlist.name) return;
    setListAction("rename");
    try {
      const response = await fetch("/api/watchlists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentWatchlist.id, name: trimmedName }),
      });
      const data = (await response.json()) as { name?: string; error?: string };
      if (!response.ok || !data.name) throw new Error(data.error ?? "The Watchlist could not be renamed.");
      setRenameListName(data.name);
      toast.success("Watchlist renamed.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The Watchlist could not be renamed.");
    } finally {
      setListAction(null);
    }
  }

  async function endMembership() {
    if (!currentWatchlist) return;
    const deleting = currentWatchlist.role === "owner";
    const confirmed = window.confirm(
      deleting
        ? `Delete “${currentWatchlist.name}” and all of its films, history, invitations, and reviews?`
        : `Leave “${currentWatchlist.name}”? You will lose access unless you are invited again.`,
    );
    if (!confirmed) return;

    setListAction("lifecycle");
    try {
      const response = await fetch("/api/watchlists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentWatchlist.id }),
      });
      const data = (await response.json()) as { action?: "deleted" | "left"; error?: string };
      if (!response.ok || !data.action) throw new Error(data.error ?? "The Watchlist could not be updated.");
      managerDialog.current?.close();
      toast.success(data.action === "deleted" ? "Watchlist deleted." : "You left the Watchlist.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The Watchlist could not be updated.");
    } finally {
      setListAction(null);
    }
  }

  async function importLegacyMovies() {
    if (!legacyMovies.length) return;
    setLegacyImporting(true);
    try {
      await Promise.all(legacyMovies.map((movie) => saveMovie(movie)));
      window.localStorage.removeItem(STORAGE_KEY);
      setLegacyMovies([]);
      await refreshWatchlist();
      toast.success("Older local films were imported into this Watchlist.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The older local films could not be imported.");
    } finally {
      setLegacyImporting(false);
    }
  }

  function dismissLegacyMovies() {
    window.localStorage.removeItem(STORAGE_KEY);
    setLegacyMovies([]);
  }

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
      toast.error(errorMessage);
      void refreshWatchlist().catch(() => toast.error("The Watchlist could not be refreshed.", { id: "watchlist-refresh" }));
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
      toast.error(errorMessage);
      void refreshWatchlist().catch(() => toast.error("The Watchlist could not be refreshed.", { id: "watchlist-refresh" }));
    });
  }

  async function restoreMovie(movie: Movie, originalIndex: number, removalRequest: Promise<void>) {
    try {
      await removalRequest;
    } catch {
      void refreshWatchlist().catch(() => toast.error("The Watchlist could not be refreshed.", { id: "watchlist-refresh" }));
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
      toast.error(errorMessage);
      void refreshWatchlist().catch(() => toast.error("The Watchlist could not be refreshed.", { id: "watchlist-refresh" }));
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
    setReviewRating(null);
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
      setReviewRating(ownReview?.rating ?? null);
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
          rating: reviewRating,
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
        <div className="header-brand"><h1><InsiemeLogo /></h1></div>
        <div className="header-right">
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
            <button className="manage-watchlists-button" type="button" onClick={openManager} disabled={listAction !== null}>
              <SettingsIcon />
              <span className="manage-label-wide">Manage Watchlists</span>
              <span className="manage-label-short">Manage</span>
            </button>
          </div>
        </div>
        <Link href="/profile" className="current-profile header-identity"><ProfileAvatar displayName={profile.displayName} small /><span>{profile.displayName}</span></Link>
      </header>

      {legacyMovies.length ? (
        <section className="legacy-import" aria-labelledby="legacy-import-title">
          <div>
            <h2 id="legacy-import-title">Older local films found</h2>
            <p>
              Import {legacyMovies.length} {legacyMovies.length === 1 ? "film" : "films"} saved on this browser into {watchlists.find((item) => item.id === watchlistId)?.name ?? "this Watchlist"}?
            </p>
          </div>
          <div className="legacy-import-actions">
            <button type="button" onClick={() => void importLegacyMovies()} disabled={legacyImporting}>
              {legacyImporting ? "Importing…" : "Import films"}
            </button>
            <button type="button" className="legacy-dismiss" onClick={dismissLegacyMovies} disabled={legacyImporting}>Dismiss</button>
          </div>
        </section>
      ) : null}

      <WatchlistSearch
        watchlistName={currentWatchlist?.name ?? "Watchlist"}
        members={membersLoadedFor === watchlistId ? members : null}
        watchlist={watchlist}
        history={history}
        inputRef={searchInput}
        onViewWatchlist={() => {
          setWatchlistOpen(true);
          document.getElementById("watchlist-heading")?.focus();
          document.getElementById("watchlist-heading")?.scrollIntoView({ block: "start" });
        }}
        onAdd={addMovie}
        onOpenDetails={openDetails}
      />

      <section className="list-section" aria-labelledby="watchlist-heading">
        <div className="list-heading">
          <h2 id="watchlist-heading" tabIndex={-1}>
            <button
              className="list-heading-toggle"
              type="button"
              aria-expanded={watchlistOpen}
              aria-controls="watchlist-content"
              onClick={() => setWatchlistOpen((open) => !open)}
            >
              <span>Watchlist</span>
              {watchlist.length ? <span className="list-count">{watchlist.length}</span> : null}
              <span className="collapse-arrow" aria-hidden="true" />
            </button>
          </h2>
        </div>

        <div id="watchlist-content" className={`collapsible-panel${watchlistOpen ? "" : " is-collapsed"}`} aria-hidden={!watchlistOpen} inert={!watchlistOpen}>
          <div className="collapsible-inner">
            {!ready ? (
              <FilmGridSkeleton count={4} />
            ) : watchlist.length ? (
              <ul className="film-grid">
                {watchlist.map((movie) => (
                    <li
                      className="group"
                      key={movie.id}
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
                          <span className="film-meta">{movie.year || "Year unknown"} · {formatMovieRating(movie)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="empty-state">
                <span className="empty-state-icon empty-state-list-icon" aria-hidden="true"><ListIcon /></span>
                <strong>Your Watchlist is empty</strong>
                <span>Search for a film above and add it to your shared list.</span>
                <button type="button" onClick={() => searchInput.current?.focus()}>Find a film</button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="list-section history-section" aria-labelledby="history-heading">
        <div className="list-heading">
          <h2 id="history-heading">
            <button
              className="list-heading-toggle"
              type="button"
              aria-expanded={historyOpen}
              aria-controls="history-content"
              onClick={() => setHistoryOpen((open) => !open)}
            >
              <span>Watched history</span>
              {history.length ? <span className="list-count">{history.length}</span> : null}
              <span className="collapse-arrow" aria-hidden="true" />
            </button>
          </h2>
        </div>

        <div id="history-content" className={`collapsible-panel${historyOpen ? "" : " is-collapsed"}`} aria-hidden={!historyOpen} inert={!historyOpen}>
          <div className="collapsible-inner">
            {history.length ? (
              <ul className="film-grid history-grid">
                {history.map((movie) => (
                    <li
                      className="group history-card"
                      key={movie.id}
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
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="empty-state">
                <span className="empty-state-icon empty-state-list-icon" aria-hidden="true">◷</span>
                <strong>No watched films yet</strong>
                <span>Films you mark as watched will appear here.</span>
              </div>
            )}
          </div>
        </div>
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
        className="watchlist-manager-dialog"
        ref={managerDialog}
        aria-labelledby="watchlist-manager-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") managerDialog.current?.close();
        }}
      >
        <button className="dialog-close" type="button" onClick={() => managerDialog.current?.close()} aria-label="Close Watchlist manager">×</button>
        <div className="manager-content">
          <header className="details-heading">
            <p>Watchlists</p>
            <h2 id="watchlist-manager-title">Manage Watchlists</h2>
            <p className="tagline">Choose a list, invite a friend, or start a new one.</p>
          </header>

          <section className="manager-section" aria-labelledby="your-watchlists-title">
            <div className="manager-section-heading">
              <div>
                <h3 id="your-watchlists-title">Your Watchlists</h3>
                <p>Switch between the lists you belong to.</p>
              </div>
            </div>
            <div className="manager-list">
              {watchlists.map((item) => (
                <div className={`manager-list-item${item.id === watchlistId ? " is-current" : ""}`} key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    {item.id === watchlistId ? <span className="manager-current-label">Current</span> : null}
                    <span className="manager-role-label">{item.role === "owner" ? "Owner" : "Member"}</span>
                  </div>
                  {item.id !== watchlistId ? (
                    <button type="button" onClick={() => void selectList(item.id)} disabled={listAction !== null}>Use list</button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="manager-section" aria-labelledby="watchlist-members-title">
            <div className="manager-section-heading">
              <div>
                <h3 id="watchlist-members-title">Members</h3>
                <p>People who share this Watchlist.</p>
              </div>
              <button type="button" onClick={() => void copyInvitation()} disabled={listAction !== null}>
                {listAction === "invite" ? "Copying…" : "Copy invite link"}
              </button>
            </div>
            <ul className="manager-members" aria-label="Watchlist members">
              {members.map((member) => (
                <li className="manager-member" key={member.profile.userId}>
                  <ProfileAvatar displayName={member.profile.displayName} small />
                  <span>{member.profile.displayName}</span>
                  {member.role === "owner" ? <span className="manager-member-role">Owner</span> : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="manager-section manager-create-section" aria-labelledby="new-watchlist-title">
            <div className="manager-section-heading">
              <div>
                <h3 id="new-watchlist-title">Create a new Watchlist</h3>
                <p>Start a separate list for another group or mood.</p>
              </div>
            </div>
            <form
              className="manager-create-form"
              onSubmit={(event) => {
                event.preventDefault();
                void createList(newListName);
              }}
            >
              <label htmlFor="new-watchlist-name">Watchlist name</label>
              <div className="manager-create-row">
                <input
                  id="new-watchlist-name"
                  value={newListName}
                  onChange={(event) => setNewListName(event.target.value)}
                  maxLength={80}
                  placeholder="For example: Weekend picks"
                  required
                />
                <button type="submit" disabled={listAction !== null || !newListName.trim()}>
                  {listAction === "create" ? "Creating…" : "Create list"}
                </button>
              </div>
            </form>
          </section>
          <details className="manager-section manager-settings" key={watchlistId}>
            <summary>Watchlist settings</summary>
            <div className="manager-section-heading">
              <div>
                <p>{currentWatchlist?.role === "owner" ? "Rename this Watchlist or remove it permanently." : "Only the Owner can rename or delete this Watchlist."}</p>
              </div>
            </div>
            {currentWatchlist?.role === "owner" ? (
              <form
                className="manager-create-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void renameList(renameListName);
                }}
              >
                <label htmlFor="rename-watchlist-name">Watchlist name</label>
                <div className="manager-create-row">
                  <input
                    id="rename-watchlist-name"
                    value={renameListName}
                    onChange={(event) => setRenameListName(event.target.value)}
                    maxLength={80}
                    required
                  />
                  <button type="submit" disabled={listAction !== null || !renameListName.trim() || renameListName.trim() === currentWatchlist.name}>
                    {listAction === "rename" ? "Saving…" : "Save name"}
                  </button>
                </div>
              </form>
            ) : null}
            <div className="manager-danger-zone">
              <div>
                <strong>{currentWatchlist?.role === "owner" ? "Delete Watchlist" : "Leave Watchlist"}</strong>
                <p>{currentWatchlist?.role === "owner" ? "This also deletes its films, history, invitations, and reviews." : "You can rejoin later with a new invitation."}</p>
              </div>
              <button type="button" onClick={() => void endMembership()} disabled={listAction !== null}>
                {listAction === "lifecycle" ? "Working…" : currentWatchlist?.role === "owner" ? "Delete" : "Leave"}
              </button>
            </div>
          </details>

        </div>
      </dialog>

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

            {watchlist.some((movie) => movie.id === selectedMovie.id) ? (
              <div className="details-actions">
                <button
                  className="details-watched-button"
                  type="button"
                  onClick={() => {
                    detailsDialog.current?.close();
                    void markWatched(selectedMovie);
                  }}
                >
                  Mark as watched
                </button>
                <button
                  className="details-remove-button"
                  type="button"
                  onClick={() => {
                    detailsDialog.current?.close();
                    removeMovie(selectedMovie);
                  }}
                >
                  Remove from Watchlist
                </button>
              </div>
            ) : null}

            {detailsLoading ? <div className="details-state" role="status"><span className="details-spinner" aria-hidden="true" />Loading film details…</div> : null}
            {detailsError ? <p className="details-state details-error" role="alert">{detailsError}</p> : null}

            {details ? (
              <>
                <dl className="details-facts">
                  {details.releaseDate ? <div><dt>Released</dt><dd>{formatDate(details.releaseDate)}</dd></div> : null}
                  {details.runtime ? <div><dt>Runtime</dt><dd>{formatRuntime(details.runtime)}</dd></div> : null}
                  {details.tmdbRating ? <div><dt>TMDb score</dt><dd>{details.tmdbRating.toFixed(1)} / 10</dd></div> : null}
                  {details.imdbRating ? <div><dt>IMDb rating</dt><dd>{details.imdbRating.toFixed(1)} / 10</dd></div> : null}
                  {details.director ? <div><dt>Director</dt><dd>{details.director}</dd></div> : null}
                </dl>

                {details.genres.length ? <p className="genre-list" aria-label="Genres">{details.genres.map((genre) => <span key={genre}>{genre}</span>)}</p> : null}

                {history.some((movie) => movie.id === selectedMovie.id) ? (
                  <ReviewsPanel
                    reviews={reviews}
                    loading={reviewsLoading}
                    error={reviewsError}
                    text={reviewText}
                    rating={reviewRating}
                    saving={reviewSaving}
                    onTextChange={setReviewText}
                    onRatingChange={setReviewRating}
                    onSave={saveReview}
                    onDelete={() => void deleteReview()}
                  />
                ) : null}

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

          </div>
        ) : null}
      </dialog>
    </main>
  );
}

function ReviewsPanel({ reviews, loading, error, text, rating, saving, onTextChange, onRatingChange, onSave, onDelete }: {
  reviews: Review[];
  loading: boolean;
  error: string;
  text: string;
  rating: number | null;
  saving: boolean;
  onTextChange: (text: string) => void;
  onRatingChange: (rating: number | null) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: () => void;
}) {
  const hasOwnReview = reviews.some((review) => review.own);

  return (
    <section className="details-section reviews-section" aria-labelledby="reviews-title">
      <h3 id="reviews-title">Reviews</h3>
      {loading ? <p className="reviews-state" role="status">Loading reviews…</p> : null}
      {error ? <p className="reviews-state reviews-error" role="alert">{error}</p> : null}
      <div className="reviews-list">
        {reviews.filter((review) => !review.own).map((review) => (
          <article className="review-card" key={review.id}>
            <div className="review-card-heading">
              {review.profile ? <span className="review-author"><ProfileAvatar displayName={review.profile.displayName} small /><strong>{review.profile.displayName}</strong></span> : <strong>Watchlist member</strong>}
              {review.rating ? <RatingStars rating={review.rating} label={formatReviewRating(review.rating)} /> : null}
            </div>
            <p>{review.text}</p>
          </article>
        ))}
        {!loading && !reviews.some((review) => !review.own) ? <p className="reviews-empty">No reviews from other members yet.</p> : null}
      </div>
      <form className="review-form" onSubmit={onSave}>
        <label htmlFor="review-text">Your review</label>
        <textarea
          id="review-text"
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          maxLength={5000}
          required
          disabled={saving || loading}
          placeholder="What did you think?"
        />
        <div className="review-rating-field">
          <span className="review-rating-label">Rating <span>(optional)</span></span>
          <StarRating value={rating} onChange={onRatingChange} disabled={saving || loading} />
        </div>
        <div className="review-actions">
          <button type="submit" disabled={saving || loading || !text.trim()}>{saving ? "Saving…" : hasOwnReview ? "Update review" : "Add review"}</button>
          {hasOwnReview ? <button className="review-delete" type="button" onClick={onDelete} disabled={saving || loading}>Delete</button> : null}
        </div>
      </form>
    </section>
  );
}

function StarRating({ value, onChange, disabled }: { value: number | null; onChange: (rating: number | null) => void; disabled: boolean }) {
  const label = value ? `${formatReviewRating(value)} selected` : "No rating selected";
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const displayedRating = hoverRating ?? value;

  return (
    <div className="star-rating" role="group" aria-label={`Film rating: ${label}`}>
      <div className="star-rating-control" onMouseLeave={() => setHoverRating(null)}>
        <RatingStars rating={displayedRating} />
        <div className="star-rating-options" role="radiogroup" aria-label="Choose a rating from half to five stars">
        {Array.from({ length: 10 }, (_, index) => {
          const rating = index + 1;
          return (
            <button
              key={rating}
              type="button"
              className="star-rating-option"
              aria-label={`Rate ${formatReviewRating(rating)}`}
              aria-checked={value === rating}
              role="radio"
              data-rating={rating}
              tabIndex={value === rating || (!value && rating === 1) ? 0 : -1}
              disabled={disabled}
              onMouseEnter={() => setHoverRating(rating)}
              onFocus={() => setHoverRating(rating)}
              onBlur={() => setHoverRating(null)}
              onKeyDown={(event) => {
                const direction = event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 0;
                if (!direction) return;
                event.preventDefault();
                const nextRating = Math.min(10, Math.max(1, rating + direction));
                onChange(nextRating);
                (event.currentTarget.parentElement?.querySelector(`[data-rating="${nextRating}"]`) as HTMLButtonElement | null)?.focus();
              }}
              onClick={() => onChange(rating)}
            />
          );
        })}
        </div>
      </div>
      {value ? (
        <button type="button" className="clear-rating" onClick={() => onChange(null)} disabled={disabled}>
          Clear
        </button>
      ) : null}
      <output className="star-rating-value" aria-live="polite">{value ? formatReviewRating(value) : "No rating"}</output>
    </div>
  );
}

function FilmGridSkeleton({ count, compact = false }: { count: number; compact?: boolean }) {
  return (
    <ul className={`${compact ? "search-results" : "film-grid"} skeleton-grid`} aria-label="Loading films" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <span className="skeleton-poster" />
          <span className="skeleton-copy">
            <span className="skeleton-line skeleton-line-title" />
            <span className="skeleton-line" />
          </span>
          {!compact ? <span className="skeleton-action" /> : null}
        </li>
      ))}
    </ul>
  );
}

function RatingStars({ rating, label }: { rating: number | null; label?: string }) {
  return (
    <span className="rating-stars" aria-label={label} aria-hidden={label ? undefined : true}>
      {Array.from({ length: 5 }, (_, index) => {
        const step = index + 1;
        const fill = !rating ? "empty" : rating >= step * 2 ? "full" : rating === step * 2 - 1 ? "half" : "empty";
        return <StarIcon className={`rating-star rating-star-${fill}`} key={step} />;
      })}
    </span>
  );
}

function StarIcon({ className }: { className: string }) {
  const halfStarId = useId();
  const isHalf = className.includes("rating-star-half");

  return (
    <svg className={className} viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <defs>
        <linearGradient id={halfStarId} x1="0" x2="1">
          <stop offset="50%" stopColor="#e6aa2f" />
          <stop offset="50%" stopColor="#ded8ca" />
        </linearGradient>
      </defs>
      <path fill={isHalf ? `url(#${halfStarId})` : "currentColor"} d="m12 2.7 2.85 5.77 6.37.93-4.61 4.49 1.09 6.34L12 17.23 6.3 20.23l1.09-6.34L2.78 9.4l6.37-.93L12 2.7Z" />
    </svg>
  );
}

function formatReviewRating(rating: number) {
  return `${(rating / 2).toFixed(1)} / 5`;
}

function formatRating(rating: number) {
  return rating ? rating.toFixed(1) : "N/A";
}

function formatMovieRating(movie: Movie) {
  const source = movie.ratingSource === "legacy" ? "Legacy rating" : movie.ratingSource === "imdb" ? "IMDb" : "TMDb";
  return `${source} ${formatRating(movie.rating)}`;
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

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8 3.5-2.1-1.2.1-2.4-2.4-1.4-2 1.3-2-1.3L7.2 7l-2.4 1.4.1 2.4L2.8 12l2.1 1.2-.1 2.4L7.2 17l2-1.3 2 1.3 2-1.3 2 1.3 2.4-1.4-.1-2.4L20 12Z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false">
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
      <path d="M8 6h12M8 12h12M8 18h12" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
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
      className={`poster poster-${size}`}
      src={movie.poster}
      alt={`${movie.title} poster`}
      width={dimensions.width}
      height={dimensions.height}
      sizes="(max-width: 700px) 104px, (max-width: 950px) 33vw, 25vw"
    />
  );
}
