import "server-only";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createRatingService, type CachedFilmRating } from "@/app/lib/imdb-cache";
import { createImdbProvider } from "@/app/lib/imdb-provider";

const rate = createRatingService({
  read: async (id) => {
    const admin = createAdminClient();
    if (!admin) return null;
    const { data, error } = await admin.from("film_ratings")
      .select("imdb_id,imdb_rating,lookup_status,fetched_at").eq("tmdb_id", id)
      .abortSignal(AbortSignal.timeout(2000)).maybeSingle();
    if (error) return null;
    return data as CachedFilmRating | null;
  },
  write: async (id, value) => {
    const admin = createAdminClient();
    if (!admin) return;
    await admin.from("film_ratings").upsert({ tmdb_id: id, ...value })
      .abortSignal(AbortSignal.timeout(2000));
  },
  lookup: createImdbProvider({ tmdbToken: process.env.TMDB_READ_TOKEN, omdbKey: process.env.OMDB_API_KEY }),
});

export function getImdbRating({ tmdbId }: { tmdbId: number }) {
  return rate(tmdbId);
}
