export type RatingStatus = "rated" | "unrated" | "unavailable";
export type ImdbRating = { rating: number | null; ratingStatus: RatingStatus };
export type OmdbMovie = { Response?: string; imdbRating?: string; Error?: string };

export function parseImdbRating(data: OmdbMovie): number | null {
  if (data?.Response === "False" && data.Error === "Movie not found!") return null;
  if (data?.Response !== "True") throw new Error(data?.Error || "Invalid OMDb response.");
  if (data.imdbRating === "N/A") return null;
  if (!data.imdbRating?.trim()) throw new Error("Missing IMDb rating.");
  const rating = Number(data.imdbRating);
  if (!Number.isFinite(rating) || rating <= 0 || rating > 10) throw new Error("Invalid IMDb rating.");
  return rating;
}

export function formatImdbRating(value: ImdbRating) {
  if (value.ratingStatus === "unavailable") return "Temporarily unavailable";
  return value.ratingStatus === "rated" && value.rating !== null ? value.rating.toFixed(1) + " / 10" : "Not rated";
}
