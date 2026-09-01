import type { Profile } from "@/app/profile/avatar";

export type Movie = {
  id: number;
  title: string;
  year: string;
  poster: string;
  overview: string;
  rating: number;
  ratingSource: "tmdb" | "imdb" | "legacy";
};

export type HistoryMovie = Movie & { watchedAt: string };

export type Review = {
  id: string;
  text: string;
  rating: number | null;
  own: boolean;
  createdAt: string;
  updatedAt: string;
  profile: Profile | null;
};

export type MovieDetails = {
  id: number;
  title: string;
  tagline: string;
  overview: string;
  releaseDate: string;
  runtime: number;
  tmdbRating: number;
  imdbRating: number;
  genres: string[];
  countries: string[];
  director: string;
  cast: string[];
  backdrops: string[];
  trailer: { key: string; name: string } | null;
};

export type WatchlistSummary = { id: string; name: string };
