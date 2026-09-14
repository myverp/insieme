import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Home from "@/app/film-workspace";
import { FilmDetailsError, getFilmDetails } from "@/app/lib/movie-details";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const film = await getFilmDetails((await params).id);
    return { title: `${film.title} (${film.releaseDate.slice(0, 4) || "Film"}) — Insieme`, description: film.overview };
  } catch { return { title: "Film — Insieme" }; }
}

export default async function FilmPage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const { from } = await searchParams;
  const returnTo = from === "/" || from?.startsWith("/?") ? from : "/";
  let film;
  try {
    film = await getFilmDetails(id);
  } catch (error) {
    if (error instanceof FilmDetailsError && error.status === 404) notFound();
    throw error;
  }
  return <Home film={film} returnTo={returnTo} searchParams={Promise.resolve({})} />;
}
