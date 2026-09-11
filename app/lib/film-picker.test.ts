import assert from "node:assert/strict";
import test from "node:test";
import { pickFilm } from "./film-picker.ts";

test("handles empty and single-film lists", () => {
  assert.equal(pickFilm([], []), null);
  assert.equal(pickFilm([{ id: 1 }], [1])?.film.id, 1);
});

test("visits every film before repeating and avoids a repeat across cycles", () => {
  const films = [{ id: 1 }, { id: 2 }, { id: 3 }];
  let seen: number[] = [];
  const picked: number[] = [];
  for (let i = 0; i < 4; i++) {
    const result = pickFilm(films, seen, () => 0.99)!;
    seen = result.seen;
    picked.push(result.film.id);
  }
  assert.equal(new Set(picked.slice(0, 3)).size, 3);
  assert.notEqual(picked[2], picked[3]);
});

test("excludes removed films and includes newly added ones", () => {
  const result = pickFilm([{ id: 2 }, { id: 3 }], [1, 2], () => 0)!;
  assert.equal(result.film.id, 3);
  assert.deepEqual(result.seen, [2, 3]);
});
