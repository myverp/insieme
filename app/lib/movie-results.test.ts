import assert from "node:assert/strict";
import test from "node:test";
import { collectMovieResults } from "./movie-results.ts";

type TestMovie = { id: number; rating: number };

test("minimum IMDb rating fills the result limit from later source pages", async () => {
  const loadedPages: number[] = [];
  const pages = new Map<number, TestMovie[]>([
    [1, Array.from({ length: 20 }, (_, index) => ({ id: index + 1, rating: index < 12 ? 6.5 : 5.5 }))],
    [2, Array.from({ length: 20 }, (_, index) => ({ id: index + 21, rating: 7 }))],
  ]);

  const results = await collectMovieResults({
    loadPage: async (page) => {
      loadedPages.push(page);
      return { movies: pages.get(page) ?? [], hasMore: page < 2 };
    },
    rateMovie: async (movie) => movie.rating,
    getMovieId: (movie) => movie.id,
    minRating: 6,
    compare: (first, second) => second.movie.id - first.movie.id,
  });

  assert.equal(results.length, 20);
  assert.deepEqual(loadedPages, [1, 2]);
  assert.ok(results.every(({ rating }) => rating >= 6));
});

test("IMDb ranking compares candidates from every configured page", async () => {
  const loadedPages: number[] = [];
  const pages = new Map<number, TestMovie[]>([
    [1, Array.from({ length: 20 }, (_, index) => ({ id: index + 1, rating: 6 }))],
    [2, [{ id: 21, rating: 9.5 }]],
  ]);

  const results = await collectMovieResults({
    loadPage: async (page) => {
      loadedPages.push(page);
      return { movies: pages.get(page) ?? [], hasMore: page < 2 };
    },
    rateMovie: async (movie) => movie.rating,
    getMovieId: (movie) => movie.id,
    minRating: 0,
    compare: (first, second) => second.rating - first.rating,
    scanAllPages: true,
  });

  assert.deepEqual(loadedPages, [1, 2]);
  assert.equal(results[0]?.movie.id, 21);
});

test("duplicate films from later pages are returned once", async () => {
  const results = await collectMovieResults({
    loadPage: async (page) => ({
      movies: page === 1
        ? [{ id: 1, rating: 6 }, { id: 2, rating: 6 }]
        : [{ id: 2, rating: 6 }, { id: 3, rating: 6 }],
      hasMore: page < 2,
    }),
    rateMovie: async (movie) => movie.rating,
    getMovieId: (movie) => movie.id,
    minRating: 0,
    compare: (first, second) => first.movie.id - second.movie.id,
    limit: 20,
    scanAllPages: true,
  });

  assert.deepEqual(results.map(({ movie }) => movie.id), [1, 2, 3]);
});

test("collection stops at the page cap when too few films qualify", async () => {
  const loadedPages: number[] = [];
  const results = await collectMovieResults({
    loadPage: async (page) => {
      loadedPages.push(page);
      return { movies: [{ id: page, rating: 8 }], hasMore: true };
    },
    rateMovie: async (movie) => movie.rating,
    getMovieId: (movie) => movie.id,
    minRating: 8,
    compare: (first, second) => first.movie.id - second.movie.id,
    maxPages: 3,
  });

  assert.deepEqual(loadedPages, [1, 2, 3]);
  assert.equal(results.length, 3);
});

test("skips an unavailable rating and continues collecting results", async () => {
  const errors: number[] = [];
  const results = await collectMovieResults({
    loadPage: async () => ({
      movies: [{ id: 1 }, { id: 2 }, { id: 3 }],
      hasMore: false,
    }),
    rateMovie: async (movie) => {
      if (movie.id === 2) throw new Error("IMDb lookup failed");
      return 8;
    },
    onRateError: (_error, movie) => errors.push(movie.id),
    getMovieId: (movie) => movie.id,
    minRating: 8,
    compare: (first, second) => first.movie.id - second.movie.id,
  });

  assert.deepEqual(results.map(({ movie }) => movie.id), [1, 3]);
  assert.deepEqual(errors, [2]);
});

test("stops IMDb enrichment once a non-ranking search has enough matches", async () => {
  const ratedIds: number[] = [];
  const results = await collectMovieResults({
    loadPage: async () => ({
      movies: Array.from({ length: 20 }, (_, index) => ({ id: index + 1, rating: 8 })),
      hasMore: false,
    }),
    rateMovie: async (movie) => {
      ratedIds.push(movie.id);
      return movie.rating;
    },
    getMovieId: (movie) => movie.id,
    minRating: 8,
    compare: (first, second) => first.movie.id - second.movie.id,
    limit: 5,
    ratingConcurrency: 1,
  });

  assert.equal(results.length, 5);
  assert.deepEqual(ratedIds, [1, 2, 3, 4, 5]);
});
