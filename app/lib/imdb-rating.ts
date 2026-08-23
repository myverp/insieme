export type OmdbMovie = {
  Response?: "True" | "False";
  imdbRating?: string;
  Error?: string;
};

export function parseImdbRating(data: OmdbMovie) {
  if (data.Response !== "True") {
    if (!data.Error || /not found|error getting data/i.test(data.Error)) return 0;
    throw new Error(data.Error);
  }
  if (!data.imdbRating || data.imdbRating === "N/A") return 0;

  const rating = Number(data.imdbRating);
  return Number.isFinite(rating) && rating >= 0 && rating <= 10 ? rating : 0;
}
