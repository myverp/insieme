"use client";

import Image from "next/image";
import { useState } from "react";
import type { Movie } from "./watchlist-types";

export function FilmPoster({ movie }: { movie: Pick<Movie, "poster" | "title"> }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!movie.poster || failed === movie.poster) return <span className="poster-placeholder poster-card" role="img" aria-label={`No poster available for ${movie.title}`}>No poster</span>;
  return <Image className="poster poster-card" src={movie.poster} alt={`${movie.title} poster`} width={342} height={513} sizes="(max-width: 700px) 46vw, (max-width: 1100px) 23vw, 200px" onError={() => setFailed(movie.poster)} />;
}
