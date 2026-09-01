# Film discovery and ratings

Insieme uses TMDb as the discovery source. Title searches use TMDb movie search, while filter-only discovery uses TMDb movie discovery. Minimum-score filtering is based on the TMDb score and requires at least 100 TMDb votes so a film with only a few votes does not appear as highly rated.

OMDb is not a discovery engine. It is queried only for one exact IMDb ID when a Member opens film details. IMDb failures never remove films from discovery results or prevent the Watchlist from loading.

## Rating sources

- Discovery results and newly saved Watchlist films use `TMDb` scores.
- Film details show the TMDb score and, when available, the IMDb rating.
- Existing Watchlist rows are marked `legacy` during migration because their historical rating source cannot be determined reliably.

## Persistent IMDb cache

Migration `20260901210958_cache_film_ratings.sql` creates `public.film_ratings`. Browser roles receive no privileges on this table and RLS is enabled. Only the server-side Supabase secret key can read or update cached ratings.

Cached ratings and unavailable results are reused for 30 days. Transient OMDb failures are not cached.

Required server configuration:

```text
TMDB_READ_TOKEN=...
OMDB_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SECRET_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` remains supported as a legacy server-side fallback. Neither key may be exposed through a `NEXT_PUBLIC_` variable.

## Local verification

Apply the migration only to the correct local Insieme Supabase stack, then run:

```powershell
supabase db reset
supabase test db
pnpm test
pnpm run lint
pnpm exec tsc --noEmit
pnpm run build
```

Do not apply the migration to the linked production project until these checks pass.
