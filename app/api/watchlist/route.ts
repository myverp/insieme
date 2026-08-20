import { NextRequest, NextResponse } from "next/server";
import { getImdbRating } from "@/app/lib/imdb";

type MovieInput = {
  id: number;
  title: string;
  year?: string;
  poster?: string;
  overview?: string;
  rating?: number;
};

type MovieRow = {
  id: number;
  title: string;
  year: string;
  poster: string;
  overview: string;
  rating: number;
};

export async function GET() {
  const config = getConfig();
  if (!config) return unavailable();

  const response = await fetch(`${config.url}/rest/v1/watchlist_movies?select=id,title,year,poster,overview,rating&order=added_at.asc`, {
    headers: databaseHeaders(config),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) return databaseError(data, response.status);

  const movies = await Promise.all((data as MovieRow[]).map(async (row) => ({
    ...toMovie(row),
    rating: await getImdbRating({ tmdbId: Number(row.id), title: row.title, year: row.year }),
  })));

  return NextResponse.json({ movies }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const config = getConfig();
  if (!config) return unavailable();

  const input = (await request.json().catch(() => null)) as MovieInput | null;
  if (!isMovie(input)) return NextResponse.json({ error: "Invalid film data." }, { status: 400 });

  const response = await fetch(`${config.url}/rest/v1/watchlist_movies?on_conflict=id`, {
    method: "POST",
    headers: {
      ...databaseHeaders(config, true),
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify({
      id: input.id,
      title: input.title.trim(),
      year: input.year?.slice(0, 20) ?? "",
      poster: input.poster?.slice(0, 1000) ?? "",
      overview: input.overview?.slice(0, 5000) ?? "",
      rating: clampRating(input.rating),
    }),
    cache: "no-store",
  });
  if (!response.ok) return databaseError(await response.json().catch(() => null), response.status);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const config = getConfig();
  if (!config) return unavailable();

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid film id." }, { status: 400 });

  const response = await fetch(`${config.url}/rest/v1/watchlist_movies?id=eq.${id}`, {
    method: "DELETE",
    headers: databaseHeaders(config, true),
    cache: "no-store",
  });
  if (!response.ok) return databaseError(await response.json().catch(() => null), response.status);

  return NextResponse.json({ ok: true });
}

function getConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret = process.env.INSIEME_DB_SECRET;
  return url && key && secret ? { url, key, secret } : null;
}

function databaseHeaders(config: NonNullable<ReturnType<typeof getConfig>>, write = false) {
  return {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    ...(write ? { "x-insieme-secret": config.secret } : {}),
  };
}

function isMovie(value: MovieInput | null): value is MovieInput {
  return Boolean(value && Number.isSafeInteger(value.id) && value.id > 0 && typeof value.title === "string" && value.title.trim().length > 0 && value.title.length <= 300);
}

function clampRating(value: number | undefined) {
  return Number.isFinite(value) ? Math.min(10, Math.max(0, value!)) : 0;
}

function toMovie(row: MovieRow) {
  return { id: Number(row.id), title: row.title, year: row.year, poster: row.poster, overview: row.overview, rating: Number(row.rating) };
}

function unavailable() {
  return NextResponse.json({ error: "The shared watchlist is not configured." }, { status: 503 });
}

function databaseError(data: unknown, status: number) {
  console.error("Shared watchlist database error", data);
  return NextResponse.json({ error: "The shared watchlist is temporarily unavailable." }, { status: status >= 500 ? 502 : 500 });
}
