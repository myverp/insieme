import { NextResponse } from "next/server";
import { getImdbRating } from "@/app/lib/imdb";

type TmdbDetails = {
  id: number;
  title: string;
  tagline?: string;
  overview?: string;
  release_date?: string;
  runtime?: number | null;
  imdb_id?: string | null;
  genres?: Array<{ name: string }>;
  production_countries?: Array<{ name: string }>;
  credits?: {
    cast?: Array<{ name: string; order: number }>;
    crew?: Array<{ name: string; job: string }>;
  };
  images?: {
    backdrops?: Array<{ file_path: string; vote_average?: number }>;
  };
  videos?: {
    results?: Array<{
      key: string;
      name: string;
      official?: boolean;
      published_at?: string;
      site: string;
      type: string;
    }>;
  };
  status_message?: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = process.env.TMDB_READ_TOKEN;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid film ID." }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "Film details need a TMDb API token." }, { status: 503 });
  }

  try {
    const isReadToken = token.length > 80 || token.includes(".");
    const apiKey = isReadToken ? "" : `&api_key=${encodeURIComponent(token)}`;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (isReadToken) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${id}?language=en-US&append_to_response=videos,images,credits&include_image_language=en,null${apiKey}`,
      { headers, next: { revalidate: 86400 } },
    );
    const data = (await response.json()) as TmdbDetails;

    if (!response.ok) {
      return NextResponse.json({ error: data.status_message ?? "Film details are unavailable." }, { status: response.status });
    }

    const videos = (data.videos?.results ?? [])
      .filter((video) => video.site === "YouTube" && video.type === "Trailer")
      .sort((a, b) => Number(Boolean(b.official)) - Number(Boolean(a.official)) || (b.published_at ?? "").localeCompare(a.published_at ?? ""));
    const backdrops = (data.images?.backdrops ?? [])
      .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
      .slice(0, 4)
      .map((image) => `https://image.tmdb.org/t/p/w780${image.file_path}`);
    const director = data.credits?.crew?.find((person) => person.job === "Director")?.name ?? "";
    const cast = (data.credits?.cast ?? [])
      .sort((a, b) => a.order - b.order)
      .slice(0, 6)
      .map((person) => person.name);
    const rating = await getImdbRating({
      imdbId: data.imdb_id ?? undefined,
      title: data.title,
      year: data.release_date?.slice(0, 4),
    });

    return NextResponse.json({
      details: {
        id: data.id,
        title: data.title,
        tagline: data.tagline ?? "",
        overview: data.overview ?? "",
        releaseDate: data.release_date ?? "",
        runtime: data.runtime ?? 0,
        rating,
        genres: (data.genres ?? []).map((genre) => genre.name),
        countries: (data.production_countries ?? []).map((country) => country.name),
        director,
        cast,
        backdrops,
        trailer: videos[0] ? { key: videos[0].key, name: videos[0].name } : null,
      },
    });
  } catch {
    return NextResponse.json({ error: "TMDb is temporarily unavailable." }, { status: 502 });
  }
}
