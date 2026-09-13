import assert from "node:assert/strict";

const base = process.env.IMDB_PREVIEW_URL;
assert(base, "Set IMDB_PREVIEW_URL to the isolated preview URL.");
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Use a local preview.");
async function get(path, status = 200) {
  const response = await fetch(new URL(path, base));
  const data = await response.json();
  assert.equal(response.status, status, JSON.stringify(data));
  return data;
}
for (const query of ["page=0", "page=1.5", "page=501", "page=oops", "minRating=11", "minRating=-1", "minRating=oops"]) {
  await get("/api/movies?query=Inception&" + query, 400);
}
const search = await get("/api/movies?query=Inception");
assert(search.movies.some((film) => film.id === 27205));
assert(search.movies.every((film) => film.ratingSource === "imdb"));
assert(search.movies.every((film) => film.ratingStatus === "rated" ? film.rating > 0 && film.rating <= 10 : film.rating === null));
const known = search.movies.find((film) => film.id === 27205);
assert.equal(known.ratingStatus, "rated", "IMDb must be reachable for the live smoke test.");
const filtered = await get("/api/movies?query=Inception&minRating=8&sort=imdb_rating.desc");
assert(filtered.movies.length > 0);
assert(filtered.movies.every((film) => film.ratingStatus === "rated" && film.rating >= 8));
assert(filtered.movies.every((film, index, films) => !index || films[index - 1].rating >= film.rating));
const details = await get("/api/movies/27205");
assert.equal(details.details.imdbRating, known.rating);
assert.equal("tmdbRating" in details.details, false);
const first = await get("/api/movies?query=love");
assert.equal(first.pagesLoaded, 2);
assert.equal(first.nextPage, 3);
assert(first.inspected > 0);
const next = await get("/api/movies?query=love&page=" + first.nextPage);
assert.equal(next.pagesLoaded, 2);
assert.equal(next.nextPage, 5);
assert(next.movies.some((film) => !first.movies.some((old) => old.id === film.id)));
console.log(JSON.stringify({ passed: true, firstCandidates: first.inspected, nextCandidates: next.inspected, lookupFailures: first.unavailable + next.unavailable }));
