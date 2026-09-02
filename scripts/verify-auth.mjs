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

const firstUser = await createAndLogin(first, `first-${runId}@example.test`, password, "First Member");
await createAndLogin(second, `second-${runId}@example.test`, password, "Second Member");
const outsiderUser = await createAndLogin(outsider, `outsider-${runId}@example.test`, password);

const { data: firstProfile, error: firstProfileError } = await first.supabase
  .from("profiles").select("user_id,display_name,created_at,updated_at").eq("user_id", firstUser.id).single();
assert.ifError(firstProfileError);
assert.equal(firstProfile.display_name, "First Member");
assert(firstProfile.created_at && firstProfile.updated_at, "A created profile must have timestamps");

const { data: updatedFirstProfile, error: updateFirstProfileError } = await first.supabase
  .from("profiles").update({ display_name: "First Updated" }).eq("user_id", firstUser.id).select("display_name").single();
assert.ifError(updateFirstProfileError);
assert.equal(updatedFirstProfile.display_name, "First Updated");


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

const { data: sharedProfile, error: sharedProfileError } = await second.supabase
  .from("profiles").select("user_id,display_name").eq("user_id", firstUser.id).single();
assert.ifError(sharedProfileError);
assert.equal(sharedProfile.display_name, "First Updated");

const { data: changedProfileRows, error: changedProfileRowsError } = await second.supabase
  .from("profiles").update({ display_name: "Changed by another member" }).eq("user_id", firstUser.id).select();
assert.ifError(changedProfileRowsError);
assert.deepEqual(changedProfileRows, []);

const { data: outsiderProfile, error: outsiderProfileError } = await outsider.supabase
  .from("profiles").select("user_id,display_name").eq("user_id", firstUser.id);
assert.ifError(outsiderProfileError);
assert.deepEqual(outsiderProfile, []);

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

await appError(first, `/api/reviews?filmId=${movieId + 1}`, 400, {
  method: "POST",
  watchlistId: sharedList.id,
  body: JSON.stringify({ text: "", rating: 9 }),
});
await appError(first, `/api/reviews?filmId=${movieId + 2}`, 409, {
  method: "POST",
  watchlistId: sharedList.id,
  body: JSON.stringify({ text: "Not watched yet", rating: null }),
});

const firstReview = await appRequest(first, `/api/reviews?filmId=${movieId + 1}`, {
  method: "POST",
  watchlistId: sharedList.id,
  body: JSON.stringify({ text: "A lovely shared watch.", rating: 9 }),
});
assert.equal(firstReview.review.own, true);
assert.equal(firstReview.review.rating, 9);

await appError(first, `/api/reviews?filmId=${movieId + 1}`, 409, {
  method: "POST",
  watchlistId: sharedList.id,
  body: JSON.stringify({ text: "Duplicate", rating: null }),
});

let sharedReviews = await appRequest(second, `/api/reviews?filmId=${movieId + 1}`, {
  watchlistId: sharedList.id,
});
assert.equal(sharedReviews.reviews.length, 1);
assert.equal(sharedReviews.reviews[0].own, false);
assert.equal(sharedReviews.reviews[0].text, "A lovely shared watch.");
assert.equal(sharedReviews.reviews[0].profile.displayName, "First Updated");

await appRequest(second, `/api/reviews?filmId=${movieId + 1}`, {
  method: "POST",
  watchlistId: sharedList.id,
  body: JSON.stringify({ text: "I liked it too.", rating: null }),
});
sharedReviews = await appRequest(first, `/api/reviews?filmId=${movieId + 1}`, {
  watchlistId: sharedList.id,
});
assert.equal(sharedReviews.reviews.length, 2);
assert.equal(sharedReviews.reviews.filter((review) => review.own).length, 1);

const { data: outsiderReviewRows, error: outsiderReviewRowsError } = await outsider.supabase
  .from("film_reviews")
  .select("id,watchlist_id,film_id,user_id")
  .eq("watchlist_id", sharedList.id);
assert.ifError(outsiderReviewRowsError);
assert.deepEqual(outsiderReviewRows, []);

const { error: forgedReviewError } = await outsider.supabase.from("film_reviews").insert({
  watchlist_id: sharedList.id,
  film_id: movieId + 1,
  user_id: outsiderUser.id,
  body: "I am not a member.",
  rating: 1,
});
assert(forgedReviewError, "RLS must reject reviews from non-members");

const { data: changedReviewRows, error: changedReviewRowsError } = await second.supabase
  .from("film_reviews")
  .update({ body: "Changed by another member" })
  .eq("id", firstReview.review.id)
  .select();
assert.ifError(changedReviewRowsError);
assert.deepEqual(changedReviewRows, []);

const { data: deletedReviewRows, error: deletedReviewRowsError } = await second.supabase
  .from("film_reviews")
  .delete()
  .eq("id", firstReview.review.id)
  .select();
assert.ifError(deletedReviewRowsError);
assert.deepEqual(deletedReviewRows, []);

await appRequest(first, `/api/reviews?filmId=${movieId + 1}`, {
  method: "PATCH",
  watchlistId: sharedList.id,
  body: JSON.stringify({ text: "Still lovely on reflection.", rating: 10 }),
});
sharedReviews = await appRequest(second, `/api/reviews?filmId=${movieId + 1}`, {
  watchlistId: sharedList.id,
});
assert.equal(sharedReviews.reviews.find((review) => review.id === firstReview.review.id).text, "Still lovely on reflection.");

await appRequest(second, `/api/reviews?filmId=${movieId + 1}`, {
  method: "DELETE",
  watchlistId: sharedList.id,
});
await appRequest(first, `/api/reviews?filmId=${movieId + 1}`, {
  method: "DELETE",
  watchlistId: sharedList.id,
});
sharedReviews = await appRequest(first, `/api/reviews?filmId=${movieId + 1}`, {
  watchlistId: sharedList.id,
});
assert.deepEqual(sharedReviews.reviews, []);

const managedList = await appRequest(first, "/api/watchlists", {
  method: "POST",
  body: JSON.stringify({ name: "Management test" }),
});
const managedInvitation = await appRequest(first, "/api/invitations", {
  method: "POST",
  watchlistId: managedList.id,
  body: JSON.stringify({ watchlistId: managedList.id }),
});
const managedToken = managedInvitation.url.split("/").at(-1);
assert(managedToken);
const { error: managedJoinError } = await second.supabase.rpc("accept_watchlist_invite", { invite_token: managedToken });
assert.ifError(managedJoinError);

const renamedList = await appRequest(first, "/api/watchlists", {
  method: "PUT",
  body: JSON.stringify({ id: managedList.id, name: "Renamed by Owner" }),
});
assert.equal(renamedList.name, "Renamed by Owner");
await appError(second, "/api/watchlists", 403, {
  method: "PUT",
  body: JSON.stringify({ id: managedList.id, name: "Renamed by Member" }),
});
await appError(outsider, "/api/watchlists", 403, {
  method: "PUT",
  body: JSON.stringify({ id: managedList.id, name: "Renamed by Outsider" }),
});

const { error: ownershipChangeError } = await first.supabase
  .from("watchlists")
  .update({ created_by: outsiderUser.id })
  .eq("id", managedList.id);
assert(ownershipChangeError, "Watchlist ownership must not be changeable");

const leaveResult = await appRequest(second, "/api/watchlists", {
  method: "DELETE",
  body: JSON.stringify({ id: managedList.id }),
});
assert.equal(leaveResult.action, "left");
const { data: formerMemberRows, error: formerMemberRowsError } = await second.supabase
  .from("watchlists")
  .select("id")
  .eq("id", managedList.id);
assert.ifError(formerMemberRowsError);
assert.deepEqual(formerMemberRows, []);
await appError(second, "/api/watchlists", 403, {
  method: "DELETE",
  body: JSON.stringify({ id: managedList.id }),
});
await appError(outsider, "/api/watchlists", 403, {
  method: "DELETE",
  body: JSON.stringify({ id: managedList.id }),
});

const deleteResult = await appRequest(first, "/api/watchlists", {
  method: "DELETE",
  body: JSON.stringify({ id: managedList.id }),
});
assert.equal(deleteResult.action, "deleted");
const { data: deletedListRows, error: deletedListRowsError } = await first.supabase
  .from("watchlists")
  .select("id")
  .eq("id", managedList.id);
assert.ifError(deletedListRowsError);
assert.deepEqual(deletedListRows, []);

await first.supabase.auth.signOut();
const loggedOutResponse = await fetch(`${appUrl}/api/watchlist`, { headers: { Cookie: first.cookieHeader() } });
assert.equal(loggedOutResponse.status, 401);

const { error: loginError } = await first.supabase.auth.signInWithPassword({ email: firstUser.email, password });
assert.ifError(loginError);
firstList = await appRequest(first, "/api/watchlist", { watchlistId: sharedList.id });
assert.deepEqual(firstList.history.map((movie) => movie.title), ["Our shared film"]);

console.log("Auth integration passed: profiles, Watchlist ownership, rename/leave/delete, invitations, shared history, member reviews, session persistence, logout, and outsider RLS isolation.");

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

async function createAndLogin(client, email, userPassword, displayName) {
  const { data, error } = await client.supabase.auth.signUp({ email, password: userPassword, options: displayName ? { data: { display_name: displayName } } : undefined });
  assert.ifError(error);
  assert(data.user);
  await client.supabase.auth.signOut();
  const { error: loginError } = await client.supabase.auth.signInWithPassword({ email, password: userPassword });
  assert.ifError(loginError);
  return { id: data.user.id, email };
}

async function appRequest(client, path, init = {}) {
  const { response, data } = await appResponse(client, path, init);
  assert.equal(response.ok, true, `${path} failed (${response.status}): ${JSON.stringify(data)}`);
  return data;
}

async function appError(client, path, status, init = {}) {
  const { response, data } = await appResponse(client, path, init);
  assert.equal(response.status, status, `${path} returned ${response.status}: ${JSON.stringify(data)}`);
  return data;
}

async function appResponse(client, path, init = {}) {
  const { watchlistId, ...requestInit } = init;
  const cookies = [client.cookieHeader(), watchlistId ? `insieme-watchlist=${watchlistId}` : ""].filter(Boolean).join("; ");
  const response = await fetch(`${appUrl}${path}`, {
    ...requestInit,
    headers: { "Content-Type": "application/json", Cookie: cookies, ...requestInit.headers },
  });
  const data = await response.json();
  return { response, data };
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
