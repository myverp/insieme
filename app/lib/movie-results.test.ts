import assert from "node:assert/strict";
import test from "node:test";
import { collectMovieResults } from "./movie-results.ts";

type TestMovie = { id: number; score: number; votes?: number };

test("minimum TMDb score fills the result limit from later source pages", async () => {
  const loadedPages: number[] = [];
  const pages = new Map<number, TestMovie[]>([
    [1, Array.from({ length: 20 }, (_, index) => ({ id: index + 1, score: index < 12 ? 6.5 : 5.5 }))],
    [2, Array.from({ length: 20 }, (_, index) => ({ id: index + 21, score: 7 }))],
  ]);

  const results = await collectMovieResults({
    loadPage: async (page) => {
      loadedPages.push(page);
      return { movies: pages.get(page) ?? [], hasMore: page < 2 };
    },
    acceptMovie: (movie) => movie.score >= 6,
    getMovieId: (movie) => movie.id,
    compare: (first, second) => second.id - first.id,
  });

  assert.equal(results.length, 20);
  assert.deepEqual(loadedPages, [1, 2]);
  assert.ok(results.every(({ score }) => score >= 6));
});

test("TMDb score ranking compares candidates from every configured page", async () => {
  const loadedPages: number[] = [];
  const pages = new Map<number, TestMovie[]>([
    [1, Array.from({ length: 20 }, (_, index) => ({ id: index + 1, score: 6 }))],
    [2, [{ id: 21, score: 9.5 }]],
  ]);

  const results = await collectMovieResults({
    loadPage: async (page) => {
      loadedPages.push(page);
      return { movies: pages.get(page) ?? [], hasMore: page < 2 };
    },
    acceptMovie: () => true,
    getMovieId: (movie) => movie.id,
    compare: (first, second) => second.score - first.score,
    scanAllPages: true,
  });

  assert.deepEqual(loadedPages, [1, 2]);
  assert.equal(results[0]?.id, 21);
});

test("duplicate films from later pages are returned once", async () => {
  const results = await collectMovieResults({
    loadPage: async (page) => ({
      movies: page === 1
        ? [{ id: 1, score: 6 }, { id: 2, score: 6 }]
        : [{ id: 2, score: 6 }, { id: 3, score: 6 }],
      hasMore: page < 2,
    }),
    acceptMovie: () => true,
    getMovieId: (movie) => movie.id,
    compare: (first, second) => first.id - second.id,
    limit: 20,
    scanAllPages: true,
  });

  assert.deepEqual(results.map((movie) => movie.id), [1, 2, 3]);
});

test("collection stops at the page cap when too few films qualify", async () => {
  const loadedPages: number[] = [];
  const results = await collectMovieResults({
    loadPage: async (page) => {
      loadedPages.push(page);
      return { movies: [{ id: page, score: 8 }], hasMore: true };
    },
    acceptMovie: (movie) => movie.score >= 8,
    getMovieId: (movie) => movie.id,
    compare: (first, second) => first.id - second.id,
    maxPages: 3,
  });

  assert.deepEqual(loadedPages, [1, 2, 3]);
  assert.equal(results.length, 3);
});

test("minimum score can require a meaningful vote count", async () => {
  const results = await collectMovieResults({
    loadPage: async () => ({
      movies: [
        { id: 1, score: 9, votes: 2 },
        { id: 2, score: 8.2, votes: 500 },
        { id: 3, score: 7.9, votes: 2000 },
      ],
      hasMore: false,
    }),
    acceptMovie: (movie) => movie.score >= 8 && (movie.votes ?? 0) >= 100,
    getMovieId: (movie) => movie.id,
    compare: (first, second) => second.score - first.score,
  });

  assert.deepEqual(results.map((movie) => movie.id), [2]);
});
