import assert from "node:assert/strict";
import test from "node:test";
import { parseImdbRating, formatImdbRating } from "./imdb-rating.ts";
import { createImdbProvider } from "./imdb-provider.ts";

test("valid IMDb scores and confirmed missing ratings have distinct values", () => {
  assert.equal(parseImdbRating({ Response: "True", imdbRating: "8.7" }), 8.7);
  assert.equal(parseImdbRating({ Response: "True", imdbRating: "N/A" }), null);
  assert.equal(parseImdbRating({ Response: "False", Error: "Movie not found!" }), null);
});

test("malformed, service, quota and authentication responses are failures, never unrated", () => {
  for (const data of [{}, { Response: "False", Error: "Error getting data." },
    { Response: "False", Error: "Request limit reached!" }, { Response: "False", Error: "Invalid API key!" },
    ...["", "oops", "11", "0", "-1"].map((imdbRating) => ({ Response: "True", imdbRating }))]) {
    assert.throws(() => parseImdbRating(data));
  }
});

test("display distinguishes Not rated from failed requests and never substitutes another score", () => {
  assert.equal(formatImdbRating({ rating: null, ratingStatus: "unrated" }), "Not rated");
  assert.equal(formatImdbRating({ rating: null, ratingStatus: "unavailable" }), "Temporarily unavailable");
  assert.equal(formatImdbRating({ rating: 8.1, ratingStatus: "rated" }), "8.1 / 10");
});

test("provider resolves exact IMDb identity and requests no title fallback", async () => {
  const urls: URL[] = [];
  const provider = createImdbProvider({ tmdbToken: "token", omdbKey: "key", request: async (url, options) => {
    urls.push(new URL(String(url)));
    assert.equal(options?.cache, "no-store");
    assert.ok(options?.signal);
    return Response.json(urls.length === 1 ? { imdb_id: "tt123" } : { Response: "True", imdbRating: "7.9" });
  } });
  assert.deepEqual(await provider(42), { imdbId: "tt123", rating: 7.9 });
  assert.equal(urls[1].searchParams.get("i"), "tt123");
  assert.equal(urls[1].searchParams.has("t"), false);
});

test("missing identity is unrated; failed or malformed identity never falls back to title", async () => {
  for (const payload of [null, {}, { imdb_id: "invalid" }]) {
    let calls = 0;
    const provider = createImdbProvider({ tmdbToken: "token", omdbKey: "key", request: async () => {
      calls++;
      return Response.json(payload);
    } });
    await assert.rejects(provider(42));
    assert.equal(calls, 1);
  }
  let calls = 0;
  const provider = createImdbProvider({ tmdbToken: "token", omdbKey: "key", request: async () => {
    calls++;
    return Response.json({ imdb_id: null });
  } });
  assert.deepEqual(await provider(42), { imdbId: null, rating: null });
  assert.equal(calls, 1);
});

test("rate limits honor Retry-After and recover after cooldown without caching missing ratings", async () => {
  let clock = 1000;
  let calls = 0;
  const provider = createImdbProvider({ tmdbToken: "token", omdbKey: "key", now: () => clock, request: async () => {
    calls++;
    return calls === 1 ? new Response("", { status: 429, headers: { "Retry-After": "120" } })
      : Response.json({ Response: "True", imdbRating: "8.3" });
  } });
  await assert.rejects(provider(42, "tt123"));
  clock += 60_000;
  await assert.rejects(provider(42, "tt123"));
  assert.equal(calls, 1);
  clock += 61_000;
  assert.equal((await provider(42, "tt123")).rating, 8.3);
  assert.equal(calls, 2);
});

test("HTTP 200 quota errors, HTTP failures and network timeouts back off and remain retryable", async () => {
  for (const failure of ["quota", "network", "http"]) {
    let clock = 0;
    let calls = 0;
    const provider = createImdbProvider({ tmdbToken: "token", omdbKey: "key", now: () => clock, request: async () => {
      calls++;
      if (calls > 1) return Response.json({ Response: "True", imdbRating: "6.2" });
      if (failure === "network") throw new DOMException("Timed out", "TimeoutError");
      if (failure === "http") return new Response("", { status: 503 });
      return Response.json({ Response: "False", Error: "Request limit reached!" });
    } });
    await assert.rejects(provider(42, "tt123"));
    await assert.rejects(provider(43, "tt124"));
    assert.equal(calls, 1);
    clock += 3_600_001;
    assert.equal((await provider(42, "tt123")).rating, 6.2);
  }
});

test("an incorrect individual IMDb ID is a failure without blocking other films", async () => {
  let calls = 0;
  const provider = createImdbProvider({ tmdbToken: "token", omdbKey: "key", request: async () =>
    Response.json(++calls === 1 ? { Response: "False", Error: "Incorrect IMDb ID." } : { Response: "True", imdbRating: "7" }) });
  await assert.rejects(provider(1, "tt111"), /Incorrect IMDb ID/);
  assert.equal((await provider(2, "tt222")).rating, 7);
});
