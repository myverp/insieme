import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { ensureWatchlists, selectWatchlist } from "@/app/lib/watchlist";

type ReviewInput = { text?: unknown; rating?: unknown };

type ReviewRow = {
  id: string;
  user_id: string;
  body: string;
  rating: number | null;
  created_at: string;
  updated_at: string;
};

export async function GET(request: NextRequest) {
  const auth = await authenticatedClient(request);
  if (!auth) return unauthorized();

  const filmId = filmIdFrom(request);
  if (!filmId) return invalidFilm();

  const { data, error } = await auth.supabase
    .from("film_reviews")
    .select("id,user_id,body,rating,created_at,updated_at")
    .eq("watchlist_id", auth.watchlistId)
    .eq("film_id", filmId)
    .order("created_at", { ascending: true });
  if (error) return databaseError(error);

  return NextResponse.json(
    {
      reviews: (data as ReviewRow[]).map((review) =>
        toReview(review, auth.userId),
      ),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedClient(request);
  if (!auth) return unauthorized();

  const filmId = filmIdFrom(request);
  if (!filmId) return invalidFilm();
  const input = reviewInput(await request.json().catch(() => null));
  if (!input) return invalidReview();

  const watched = await watchedState(auth, filmId);
  if (watched.error) return databaseError(watched.error);
  if (!watched.value) return notWatched();

  const { data, error } = await auth.supabase
    .from("film_reviews")
    .insert({
      watchlist_id: auth.watchlistId,
      film_id: filmId,
      user_id: auth.userId,
      body: input.text,
      rating: input.rating,
    })
    .select("id,user_id,body,rating,created_at,updated_at")
    .single();
  if (error?.code === "23505") {
    return NextResponse.json(
      { error: "You already reviewed this film." },
      { status: 409 },
    );
  }
  if (error) return databaseError(error);

  return NextResponse.json(
    { review: toReview(data as ReviewRow, auth.userId) },
    { status: 201 },
  );
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticatedClient(request);
  if (!auth) return unauthorized();

  const filmId = filmIdFrom(request);
  if (!filmId) return invalidFilm();
  const input = reviewInput(await request.json().catch(() => null));
  if (!input) return invalidReview();

  const watched = await watchedState(auth, filmId);
  if (watched.error) return databaseError(watched.error);
  if (!watched.value) return notWatched();

  const { data, error } = await auth.supabase
    .from("film_reviews")
    .update({
      body: input.text,
      rating: input.rating,
      updated_at: new Date().toISOString(),
    })
    .eq("watchlist_id", auth.watchlistId)
    .eq("film_id", filmId)
    .eq("user_id", auth.userId)
    .select("id,user_id,body,rating,created_at,updated_at")
    .maybeSingle();
  if (error) return databaseError(error);
  if (!data) {
    return NextResponse.json(
      { error: "Your review was not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ review: toReview(data as ReviewRow, auth.userId) });
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticatedClient(request);
  if (!auth) return unauthorized();

  const filmId = filmIdFrom(request);
  if (!filmId) return invalidFilm();

  const { data, error } = await auth.supabase
    .from("film_reviews")
    .delete()
    .eq("watchlist_id", auth.watchlistId)
    .eq("film_id", filmId)
    .eq("user_id", auth.userId)
    .select("id")
    .maybeSingle();
  if (error) return databaseError(error);
  if (!data) {
    return NextResponse.json(
      { error: "Your review was not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}

async function authenticatedClient(request: NextRequest) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  const watchlists = await ensureWatchlists(supabase, userId);
  const watchlist = selectWatchlist(
    watchlists,
    request.cookies.get("insieme-watchlist")?.value,
  );
  return { supabase, userId, watchlistId: watchlist.id };
}

async function watchedState(
  auth: NonNullable<Awaited<ReturnType<typeof authenticatedClient>>>,
  filmId: number,
) {
  const { data, error } = await auth.supabase
    .from("watchlist_movies")
    .select("id")
    .eq("watchlist_id", auth.watchlistId)
    .eq("id", filmId)
    .not("watched_at", "is", null)
    .maybeSingle();
  return { value: Boolean(data), error };
}

function filmIdFrom(request: NextRequest) {
  const filmId = Number(request.nextUrl.searchParams.get("filmId"));
  return Number.isSafeInteger(filmId) && filmId > 0 ? filmId : null;
}

function reviewInput(
  value: unknown,
): { text: string; rating: number | null } | null {
  if (!value || typeof value !== "object") return null;
  const { text, rating } = value as ReviewInput;
  if (typeof text !== "string") return null;

  const normalizedText = text.trim();
  if (!normalizedText || normalizedText.length > 5000) return null;
  if (
    rating !== null &&
    (!Number.isInteger(rating) || Number(rating) < 1 || Number(rating) > 10)
  ) {
    return null;
  }

  return {
    text: normalizedText,
    rating: rating === null ? null : Number(rating),
  };
}

function toReview(review: ReviewRow, userId: string) {
  return {
    id: review.id,
    text: review.body,
    rating: review.rating === null ? null : Number(review.rating),
    own: review.user_id === userId,
    createdAt: review.created_at,
    updatedAt: review.updated_at,
  };
}

function unauthorized() {
  return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
}

function invalidFilm() {
  return NextResponse.json({ error: "Invalid film id." }, { status: 400 });
}

function invalidReview() {
  return NextResponse.json(
    {
      error:
        "Review text is required and the rating must be between 1 and 10.",
    },
    { status: 400 },
  );
}

function notWatched() {
  return NextResponse.json(
    { error: "Only watched films can be reviewed." },
    { status: 409 },
  );
}

function databaseError(error: unknown) {
  console.error("Review database error", error);
  return NextResponse.json(
    { error: "Reviews are temporarily unavailable." },
    { status: 502 },
  );
}
