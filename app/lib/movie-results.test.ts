import assert from "node:assert/strict";
import test from "node:test";
import { collectMovieResults, mergeMovieResults } from "./movie-results.ts";
import type { ImdbRating } from "./imdb-rating.ts";

type Film = { id: number; score: number | null; failed?: boolean };
const rateMovie = async (film: Film): Promise<ImdbRating> => ({
  rating: film.score, ratingStatus: film.failed ? "unavailable" : film.score === null ? "unrated" : "rated",
});

test("IMDb filtering continues across candidate pages and keeps every overflow match", async () => {
  const pages: number[] = [];
  const result = await collectMovieResults({
    loadPage: async (page) => {
      pages.push(page);
      return { movies: Array.from({ length: 20 }, (_, i) => ({ id: (page - 1) * 20 + i, score: page === 1 && i > 11 ? 5 : 7 })), hasMore: true };
    },
    rateMovie, minRating: 6,
  });
  assert.deepEqual(pages, [1, 2]);
  assert.equal(result.movies.length, 32);
  assert.equal(result.inspected, 40);
  assert.equal(result.nextPage, 3);
  assert.ok(result.movies.every((movie) => movie.rating! >= 6));
});

test("empty filtered batches retain continuation, source exhaustion removes it", async () => {
  const pages: number[] = [];
  const result = await collectMovieResults({
    startPage: 3, loadPage: async (page) => { pages.push(page); return { movies: [{ id: page, score: 5 }], hasMore: page < 4 }; },
    rateMovie, minRating: 8,
  });
  assert.deepEqual(pages, [3, 4]);
  assert.equal(result.movies.length, 0);
  assert.equal(result.nextPage, null);
  assert.equal(result.sourceHasMore, false);
  const more = await collectMovieResults({
    loadPage: async (page) => ({ movies: [{ id: page, score: null }], hasMore: true }), rateMovie, minRating: 8,
  });
  assert.equal(more.nextPage, 3);
});

test("unrated films remain visible without a threshold and are excluded even by an active zero threshold", async () => {
  const loadPage = async () => ({ movies: [{ id: 1, score: null }, { id: 2, score: 7 }], hasMore: false });
  assert.equal((await collectMovieResults({ loadPage, rateMovie, minRating: null })).movies.length, 2);
  assert.deepEqual((await collectMovieResults({ loadPage, rateMovie, minRating: 0 })).movies.map((film) => film.id), [2]);
});

test("duplicates are rated once per batch; accumulation deduplicates and sorts the whole loaded set", async () => {
  let calls = 0;
  const batch = await collectMovieResults({
    loadPage: async (page) => ({ movies: [{ id: 1, score: 7 }, { id: page + 1, score: 8 }], hasMore: page === 1 }),
    rateMovie: async (movie) => { calls++; return rateMovie(movie); }, minRating: null,
  });
  assert.equal(calls, 3);
  const later = [{ id: 1, rating: 9, ratingStatus: "rated" as const }, { id: 4, rating: null, ratingStatus: "unrated" as const }];
  const sorted = mergeMovieResults(batch.movies, later, "imdb_rating.desc");
  assert.deepEqual(sorted.map((film) => film.id), [1, 2, 3, 4]);
});

test("unrated and failed ratings sort last, and TMDb votes cannot affect IMDb order", () => {
  const movies = [
    { id: 1, rating: null, ratingStatus: "unrated" as const, vote_average: 10, popularity: 100 },
    { id: 2, rating: 6, ratingStatus: "rated" as const, vote_average: 10 },
    { id: 3, rating: 9, ratingStatus: "rated" as const, vote_average: 1 },
    { id: 4, rating: null, ratingStatus: "unavailable" as const, vote_average: 10 },
  ];
  assert.deepEqual(mergeMovieResults([], movies, "imdb_rating.desc").map((film) => film.id), [3, 2, 1, 4]);
});

test("partial provider failures are explicit; filtering never treats failed ratings as qualifying", async () => {
  const loadPage = async () => ({ movies: [{ id: 1, score: 8 }, { id: 2, score: null, failed: true }], hasMore: true });
  const result = await collectMovieResults({ loadPage, rateMovie, minRating: null });
  assert.equal(result.unavailable, 1);
  assert.equal(result.movies.length, 2);
  const filtered = await collectMovieResults({ loadPage, rateMovie, minRating: 6 });
  assert.deepEqual(filtered.movies.map((movie) => movie.id), [1]);
  assert.equal(filtered.unavailable, 1);
  assert.equal(filtered.nextPage, 3);
  const ranked = await collectMovieResults({ loadPage, rateMovie, minRating: null, requireRatings: true });
  assert.equal(ranked.unavailable, 1);
  assert.equal(ranked.movies.length, 2);
});

test("a complete rating outage fails the batch so pagination can retry without advancing", async () => {
  const loadPage = async () => ({ movies: [{ id: 1, score: null, failed: true }], hasMore: true });
  await assert.rejects(collectMovieResults({ loadPage, rateMovie, minRating: 6 }), /could not be retrieved/);
});

test("TMDb failure does not return a partial successful batch", async () => {
  await assert.rejects(collectMovieResults({
    loadPage: async (page) => { if (page === 2) throw new Error("TMDb failed"); return { movies: [{ id: 1, score: 8 }], hasMore: true }; },
    rateMovie, minRating: null,
  }), /TMDb failed/);
});

test("the provider page ceiling is explicit and never advertised as exhaustive", async () => {
  const result = await collectMovieResults({
    startPage: 500, loadPage: async () => ({ movies: [], hasMore: true }), rateMovie, minRating: null,
  });
  assert.equal(result.nextPage, null);
  assert.equal(result.providerLimitReached, true);
  assert.equal(result.sourceHasMore, true);
  assert.equal(result.pagesLoaded, 1);
});

test("date sorting applies across accumulated pages and leaves unknown dates last", () => {
  const base = { rating: null, ratingStatus: "unrated" as const };
  const films = [{ ...base, id: 1, releaseDate: "" }, { ...base, id: 2, releaseDate: "2020-01-01" }, { ...base, id: 3, releaseDate: "1990-01-01" }];
  assert.deepEqual(mergeMovieResults([], films, "primary_release_date.asc").map((film) => film.id), [3, 2, 1]);
  assert.deepEqual(mergeMovieResults([], films, "primary_release_date.desc").map((film) => film.id), [2, 3, 1]);
});
