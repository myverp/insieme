import { NextResponse } from "next/server";
import { getFilmDetails, FilmDetailsError } from "@/app/lib/movie-details";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return NextResponse.json({ details: await getFilmDetails(id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Film details are unavailable." },
      { status: error instanceof FilmDetailsError ? error.status : 502 },
    );
  }
}
