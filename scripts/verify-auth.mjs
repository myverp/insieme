import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";

loadLocalEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

assert(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL is required");
assert(publishableKey, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required");

const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const password = `Insieme-${crypto.randomUUID()}!`;
const movieId = 900_000_000 + Math.floor(Math.random() * 90_000_000);
const first = authClient();
const second = authClient();
const outsider = authClient();

const rootResponse = await fetch(`${appUrl}/`, { redirect: "manual" });
assert.equal(rootResponse.status, 307);
assert.equal(rootResponse.headers.get("location"), "/login");
assert.equal((await fetch(`${appUrl}/login`)).status, 200);
assert.equal((await fetch(`${appUrl}/signup`)).status, 200);
assert.notEqual((await fetch(`${appUrl}/api/movies?query=matrix`)).status, 401, "Public film search must not require login");

const firstUser = await createAndLogin(first, `first-${runId}@example.test`, password);
await createAndLogin(second, `second-${runId}@example.test`, password);
await createAndLogin(outsider, `outsider-${runId}@example.test`, password);

assert.deepEqual(await appRequest(first, "/api/watchlist"), { movies: [], history: [] });
assert.deepEqual(await appRequest(second, "/api/watchlist"), { movies: [], history: [] });
assert.deepEqual(await appRequest(outsider, "/api/watchlist"), { movies: [], history: [] });

const { data: firstMemberships, error: firstMembershipsError } = await first.supabase
  .from("watchlist_members")
  .select("watchlist_id");
assert.ifError(firstMembershipsError);
assert.equal(firstMemberships.length, 1);
const personalListId = firstMemberships[0].watchlist_id;

await appRequest(first, "/api/watchlist", {
  method: "POST",
  body: JSON.stringify({ id: movieId, title: "First user's film", year: "2026", rating: 8 }),
});

let firstList = await appRequest(first, "/api/watchlist", { watchlistId: personalListId });
assert.deepEqual(firstList.movies.map((movie) => movie.title), ["First user's film"]);

const sharedList = await appRequest(first, "/api/watchlists", {
  method: "POST",
  body: JSON.stringify({ name: "We two" }),
});
assert.equal(sharedList.name, "We two");

await appRequest(first, "/api/watchlist", {
  method: "POST",
  watchlistId: sharedList.id,
  body: JSON.stringify({ id: movieId + 1, title: "Our shared film", year: "2026", rating: 9 }),
});

const invitation = await appRequest(first, "/api/invitations", {
  method: "POST",
  watchlistId: sharedList.id,
  body: JSON.stringify({ watchlistId: sharedList.id }),
});
const token = invitation.url.split("/").at(-1);
assert(token);

const { data: joinedListId, error: joinError } = await second.supabase.rpc("accept_watchlist_invite", { invite_token: token });
assert.ifError(joinError);
assert.equal(joinedListId, sharedList.id);

let secondList = await appRequest(second, "/api/watchlist", { watchlistId: sharedList.id });
assert.deepEqual(secondList.movies.map((movie) => movie.title), ["Our shared film"]);

await appRequest(second, "/api/watchlist", {
  method: "POST",
  watchlistId: sharedList.id,
  body: JSON.stringify({ id: movieId + 2, title: "Friend's shared film", year: "2026", rating: 7 }),
});

firstList = await appRequest(first, "/api/watchlist", { watchlistId: sharedList.id });
assert.deepEqual(firstList.movies.map((movie) => movie.title), ["Our shared film", "Friend's shared film"]);

const personalList = await appRequest(first, "/api/watchlist", { watchlistId: personalListId });
assert.deepEqual(personalList.movies.map((movie) => movie.title), ["First user's film"]);

const { data: leakedRows, error: leakedRowsError } = await second.supabase
  .from("watchlist_movies")
  .select("id,title,watchlist_id")
  .eq("watchlist_id", personalListId);
assert.ifError(leakedRowsError);
assert.deepEqual(leakedRows, []);

const { data: outsiderRows, error: outsiderRowsError } = await outsider.supabase
  .from("watchlist_movies")
  .select("id,title,watchlist_id")
  .eq("watchlist_id", sharedList.id);
assert.ifError(outsiderRowsError);
assert.deepEqual(outsiderRows, []);

const { error: forgedInsertError } = await outsider.supabase.from("watchlist_movies").insert({
  watchlist_id: sharedList.id,
  added_by: firstUser.id,
  id: movieId + 3,
  title: "Forged ownership",
});
assert(forgedInsertError, "RLS must reject inserting a row owned by another user");

const { data: changedRows, error: changedRowsError } = await outsider.supabase
  .from("watchlist_movies")
  .update({ title: "Changed by outsider" })
  .eq("watchlist_id", sharedList.id)
  .eq("id", movieId + 1)
  .select();
assert.ifError(changedRowsError);
assert.deepEqual(changedRows, []);

const { data: deletedRows, error: deletedRowsError } = await outsider.supabase
  .from("watchlist_movies")
  .delete()
  .eq("watchlist_id", sharedList.id)
  .eq("id", movieId + 1)
  .select();
assert.ifError(deletedRowsError);
assert.deepEqual(deletedRows, []);

await appRequest(second, `/api/watchlist?id=${movieId + 1}`, { method: "PATCH", watchlistId: sharedList.id });
firstList = await appRequest(first, "/api/watchlist", { watchlistId: sharedList.id });
assert.deepEqual(firstList.history.map((movie) => movie.title), ["Our shared film"]);

await first.supabase.auth.signOut();
const loggedOutResponse = await fetch(`${appUrl}/api/watchlist`, { headers: { Cookie: first.cookieHeader() } });
assert.equal(loggedOutResponse.status, 401);

const { error: loginError } = await first.supabase.auth.signInWithPassword({ email: firstUser.email, password });
assert.ifError(loginError);
firstList = await appRequest(first, "/api/watchlist", { watchlistId: sharedList.id });
assert.deepEqual(firstList.history.map((movie) => movie.title), ["Our shared film"]);

console.log("Auth integration passed: multiple Watchlists, invitations, shared history, session persistence, logout, and outsider RLS isolation.");

function authClient() {
  const jar = new Map();
  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => value ? jar.set(name, value) : jar.delete(name)),
    },
  });
  return {
    supabase,
    cookieHeader: () => [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
  };
}

async function createAndLogin(client, email, userPassword) {
  const { data, error } = await client.supabase.auth.signUp({ email, password: userPassword });
  assert.ifError(error);
  assert(data.user);
  await client.supabase.auth.signOut();
  const { error: loginError } = await client.supabase.auth.signInWithPassword({ email, password: userPassword });
  assert.ifError(loginError);
  return { id: data.user.id, email };
}

async function appRequest(client, path, init = {}) {
  const { watchlistId, ...requestInit } = init;
  const cookies = [client.cookieHeader(), watchlistId ? `insieme-watchlist=${watchlistId}` : ""].filter(Boolean).join("; ");
  const response = await fetch(`${appUrl}${path}`, {
    ...requestInit,
    headers: { "Content-Type": "application/json", Cookie: cookies, ...requestInit.headers },
  });
  const data = await response.json();
  assert.equal(response.ok, true, `${path} failed (${response.status}): ${JSON.stringify(data)}`);
  return data;
}

function loadLocalEnv() {
  try {
    for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {
    // Shell-provided variables are sufficient when .env.local is absent.
  }
}
