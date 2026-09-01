import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { ensureWatchlists, selectWatchlist } from "@/app/lib/watchlist";

type MovieInput = {
  id: number;
  title: string;
  year?: string;
  poster?: string;
  overview?: string;
  rating?: number;
  ratingSource?: "tmdb" | "imdb" | "legacy";
};

type MovieRow = {
  id: number;
  title: string;
  year: string;
  poster: string;
  overview: string;
  rating: number;
  rating_source: "tmdb" | "imdb" | "legacy";
  watched_at: string | null;
};

export async function GET(request: NextRequest) {
  const auth = await authenticatedClient(request);
  if (!auth) return unauthorized();

  const { data, error } = await auth.supabase
    .from("watchlist_movies")
    .select("id,title,year,poster,overview,rating,rating_source,watched_at")
    .eq("watchlist_id", auth.watchlistId)
    .order("added_at", { ascending: true });
  if (error) return databaseError(error);

  const rows = data as MovieRow[];
  const movies = rows.filter((row) => !row.watched_at).map(toMovie);
  const history = rows.filter((row): row is MovieRow & { watched_at: string } => Boolean(row.watched_at)).map((row) => ({
    ...toMovie(row),
    watchedAt: row.watched_at,
  }));
  history.sort((first, second) => new Date(second.watchedAt).getTime() - new Date(first.watchedAt).getTime());

  return NextResponse.json({ movies, history }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedClient(request);
  if (!auth) return unauthorized();

  const input = (await request.json().catch(() => null)) as MovieInput | null;
  if (!isMovie(input)) return NextResponse.json({ error: "Invalid film data." }, { status: 400 });

  const { error } = await auth.supabase.from("watchlist_movies").upsert(
    {
      watchlist_id: auth.watchlistId,
      added_by: auth.userId,
      id: input.id,
      title: input.title.trim(),
      year: input.year?.slice(0, 20) ?? "",
      poster: input.poster?.slice(0, 1000) ?? "",
      overview: input.overview?.slice(0, 5000) ?? "",
      rating: clampRating(input.rating),
      rating_source: isRatingSource(input.ratingSource) ? input.ratingSource : "tmdb",
    },
    { onConflict: "watchlist_id,id", ignoreDuplicates: true },
  );
  if (error) return databaseError(error);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticatedClient(request);
  if (!auth) return unauthorized();

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid film id." }, { status: 400 });

  const { error } = await auth.supabase
    .from("watchlist_movies")
    .delete()
    .eq("watchlist_id", auth.watchlistId)
    .eq("id", id)
    .is("watched_at", null);
  if (error) return databaseError(error);

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticatedClient(request);
  if (!auth) return unauthorized();

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid film id." }, { status: 400 });

  const { data, error } = await auth.supabase
    .from("watchlist_movies")
    .update({ watched_at: new Date().toISOString() })
    .eq("watchlist_id", auth.watchlistId)
    .eq("id", id)
    .is("watched_at", null)
    .select("watched_at")
    .maybeSingle();
  if (error) return databaseError(error);

  const watchedAt = data?.watched_at;
  if (!watchedAt) return NextResponse.json({ error: "The film is no longer on the watchlist." }, { status: 409 });

  return NextResponse.json({ ok: true, watchedAt });
}

async function authenticatedClient(request: NextRequest) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;
  const watchlists = await ensureWatchlists(supabase, userId);
  const watchlist = selectWatchlist(watchlists, request.cookies.get("insieme-watchlist")?.value);
  return { supabase, userId, watchlistId: watchlist.id };
}

function isMovie(value: MovieInput | null): value is MovieInput {
  return Boolean(value && Number.isSafeInteger(value.id) && value.id > 0 && typeof value.title === "string" && value.title.trim().length > 0 && value.title.length <= 300);
}

function clampRating(value: number | undefined) {
  return Number.isFinite(value) ? Math.min(10, Math.max(0, value!)) : 0;
}

function toMovie(row: MovieRow) {
  return { id: Number(row.id), title: row.title, year: row.year, poster: row.poster, overview: row.overview, rating: Number(row.rating), ratingSource: row.rating_source };
}

function isRatingSource(value: MovieInput["ratingSource"]): value is NonNullable<MovieInput["ratingSource"]> {
  return value === "tmdb" || value === "imdb" || value === "legacy";
}

function unauthorized() {
  return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
}

function databaseError(error: unknown) {
  console.error("Watchlist database error", error);
  return NextResponse.json({ error: "Your watchlist is temporarily unavailable." }, { status: 502 });
}
