import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { ensureWatchlists } from "@/app/lib/watchlist";

const COOKIE = "insieme-watchlist";

export async function POST(request: NextRequest) {
  const auth = await authenticatedClient();
  if (!auth) return unauthorized();

  const input = (await request.json().catch(() => null)) as { name?: string } | null;
  const name = input?.name?.trim();
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "Enter a name between 1 and 80 characters." }, { status: 400 });
  }

  const { data: watchlistId, error } = await auth.supabase.rpc("create_watchlist", { list_name: name });
  if (error || !watchlistId) return databaseError(error);

  const response = NextResponse.json({ id: watchlistId, name });
  response.cookies.set(COOKIE, watchlistId, cookieOptions());
  return response;
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticatedClient();
  if (!auth) return unauthorized();

  const input = (await request.json().catch(() => null)) as { id?: string } | null;
  const watchlists = await ensureWatchlists(auth.supabase, auth.userId);
  const selected = watchlists.find((watchlist) => watchlist.id === input?.id);
  if (!selected) return NextResponse.json({ error: "You are not a member of this Watchlist." }, { status: 403 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE, selected.id, cookieOptions());
  return response;
}

async function authenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  return error || !userId ? null : { supabase, userId };
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

function unauthorized() {
  return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
}

function databaseError(error: unknown) {
  console.error("Watchlist creation error", error);
  return NextResponse.json({ error: "The Watchlist could not be created." }, { status: 502 });
}
