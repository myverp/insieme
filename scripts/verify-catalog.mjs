import assert from "node:assert/strict";

// Deliberately checks the running app and real film providers; no fixture responses.
const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
async function get(path) {
  const response = await fetch(new URL(path, appUrl));
  assert.equal(response.ok, true, `${path}: HTTP ${response.status}`);
  return response.json();
}

const popular = await get("/api/movies");
assert(popular.movies.length > 0, "Discovery should offer real films before a search");
assert(popular.movies.every((film) => film.ratingSource === "tmdb"));
const filtered = await get("/api/movies?director=Christopher%20Nolan&decade=2010&minRating=8&sort=vote_average.desc");
assert(filtered.movies.length > 0);
assert(filtered.movies.every((film) => Number(film.year) >= 2010 && Number(film.year) <= 2019 && film.rating >= 8));
assert(filtered.movies.every((film, index, films) => index === 0 || film.rating <= films[index - 1].rating));
const { details } = await get("/api/movies/157336");
assert.equal(details.title, "Interstellar");
assert(details.poster && details.runtime && details.director && details.backdrops.length);
assert.equal((await fetch(new URL("/api/movies/not-a-film", appUrl))).status, 400);
assert.equal((await fetch(new URL("/api/movies?minRating=11", appUrl))).status, 400);
const unauthenticatedFilm = await fetch(new URL("/films/157336", appUrl), { redirect: "manual" });
assert.equal(unauthenticatedFilm.status, 307);
const location = new URL(unauthenticatedFilm.headers.get("location"), appUrl);
assert.equal(location.pathname, "/login");
assert.equal(location.searchParams.get("next"), "/films/157336");
console.log("Catalog integration passed: default discovery, combined filters, sorting, film details, invalid-input handling, and film login return path.");
