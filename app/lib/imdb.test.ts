import assert from "node:assert/strict";
import test from "node:test";
import { parseImdbRating } from "./imdb-rating.ts";

test("parses a valid IMDb rating", () => {
  assert.equal(parseImdbRating({ Response: "True", imdbRating: "8.7" }), 8.7);
});

test("treats unavailable film ratings as unrated", () => {
  assert.equal(parseImdbRating({ Response: "True", imdbRating: "N/A" }), 0);
  assert.equal(parseImdbRating({ Response: "False", Error: "Movie not found!" }), 0);
});

test("does not turn an OMDb service or quota error into a zero rating", () => {
  assert.throws(
    () => parseImdbRating({ Response: "False", Error: "Request limit reached!" }),
    /Request limit reached/,
  );
});
