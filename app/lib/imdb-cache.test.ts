import assert from "node:assert/strict";
import test from "node:test";
import { createRatingService, readFreshRating, RATED_TTL, UNRATED_TTL, type CachedFilmRating } from "./imdb-cache.ts";

const entry = (rating: number | null, now: number): CachedFilmRating => ({
  imdb_id: "tt123", imdb_rating: rating, lookup_status: rating === null ? "unavailable" : "ok",
  fetched_at: new Date(now).toISOString(),
});

test("positive and negative cache entries expire, and invalid/future entries are rejected", () => {
  assert.equal(readFreshRating(entry(8, 0), RATED_TTL - 1)?.rating, 8);
  assert.equal(readFreshRating(entry(8, 0), RATED_TTL), null);
  assert.equal(readFreshRating(entry(null, 0), UNRATED_TTL - 1)?.ratingStatus, "unrated");
  assert.equal(readFreshRating(entry(null, 0), UNRATED_TTL), null);
  assert.equal(readFreshRating(entry(0, 0), 0), null);
  assert.equal(readFreshRating(entry(8, 100), 0), null);
  assert.equal(readFreshRating({ ...entry(8, 0), fetched_at: "invalid" }, 0), null);
});

test("failure writes nothing, then the same film can recover on the next request", async () => {
  const writes: CachedFilmRating[] = [];
  let attempts = 0;
  const rate = createRatingService({
    read: async () => null, write: async (_, value) => { writes.push(value); },
    lookup: async () => { if (++attempts === 1) throw new Error("Temporary outage"); return { imdbId: "tt123", rating: 8 }; },
  });
  assert.equal((await rate(1)).ratingStatus, "unavailable");
  assert.equal(writes.length, 0);
  assert.equal((await rate(1)).rating, 8);
  assert.equal(writes.length, 1);
  await rate(1);
  assert.equal(attempts, 2);
});

test("confirmed unrated results are cached briefly and refreshed", async () => {
  let clock = 0;
  let calls = 0;
  const rate = createRatingService({
    read: async () => null, write: async () => {}, now: () => clock,
    lookup: async () => ({ imdbId: "tt123", rating: ++calls === 1 ? null : 7 }),
  });
  assert.equal((await rate(1)).ratingStatus, "unrated");
  await rate(1);
  assert.equal(calls, 1);
  clock += UNRATED_TTL;
  assert.equal((await rate(1)).rating, 7);
});

test("persistent cache survives process changes and cache outages do not discard valid provider ratings", async () => {
  let calls = 0;
  const cached = createRatingService({
    read: async () => entry(8, Date.now()), write: async () => {}, lookup: async () => { calls++; throw new Error(); },
  });
  assert.equal((await cached(1)).rating, 8);
  assert.equal(calls, 0);
  const noDatabase = createRatingService({
    read: async () => { throw new Error(); }, write: async () => { throw new Error(); },
    lookup: async () => ({ imdbId: "tt123", rating: 7 }),
  });
  assert.equal((await noDatabase(1)).rating, 7);
});

test("concurrent duplicate lookups coalesce and provider concurrency stays at four", async () => {
  let active = 0;
  let peak = 0;
  let calls = 0;
  const rate = createRatingService({
    read: async () => null, write: async () => {},
    lookup: async () => {
      calls++; active++; peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return { imdbId: "tt123", rating: 7 };
    },
  });
  await Promise.all(Array.from({ length: 20 }, (_, index) => rate(index % 10)));
  assert.equal(calls, 10);
  assert.equal(peak, 4);
});
