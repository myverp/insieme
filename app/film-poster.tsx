"use client";

import Image from "next/image";
import { useState } from "react";
import type { Movie } from "@/app/watchlist-types";

export function FilmPoster({ movie, eager = false }: { movie: Pick<Movie, "poster" | "title">; eager?: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!movie.poster || failedSource === movie.poster) return <span className="poster-placeholder" role="img" aria-label={`No poster available for ${movie.title}`}>Poster unavailable</span>;
  return <Image className="poster poster-card" src={movie.poster} alt={`${movie.title} poster`} width={342} height={513} sizes="(max-width: 700px) 46vw, (max-width: 1100px) 23vw, 260px" loading={eager ? "eager" : "lazy"} onError={() => setFailedSource(movie.poster)} />;
}

