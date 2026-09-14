import assert from "node:assert/strict";
import test from "node:test";
import { safeDestination } from "./navigation.ts";

test("keeps film, discovery and invitation destinations across authentication", () => {
  for (const path of ["/", "/?query=Alien&genre=878", "/films/348?from=%2F%3Fview%3Dwatchlist", "/invite/ab12-34"]) assert.equal(safeDestination(path), path);
});

test("rejects external URLs, protocol-relative paths and unsupported app routes", () => {
  for (const path of [null, "https://example.com", "//example.com", "/\\example.com", "/films/../api/watchlists", "/profile", "/films/abc", "javascript:alert(1)"]) assert.equal(safeDestination(path), null);
});
