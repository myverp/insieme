# Film discovery and IMDb ratings

TMDb supplies film IDs, title search, discovery, posters and metadata. IMDb, via exact-ID OMDb lookups, supplies every displayed external film rating and every minimum-rating/rating-sort decision. TMDb image votes still select backdrop images; they are never displayed as film scores.

## Discovery scope and pagination

The providers do not support complete IMDb-ranked discovery: [TMDb discovery](https://developer.themoviedb.org/reference/discover-movie) filters/sorts its own votes, while [OMDb](https://www.omdbapi.com/) offers individual ID/title lookups and title search, without an IMDb discovery/ranking endpoint. No scraping, paid provider or catalog ingestion was introduced.

The practical compromise is explicitly candidate-scoped discovery:

- Each `GET /api/movies` request scans up to two TMDb source pages (usually 40 candidates), starting at `page` (default 1). It returns **all** matches in those pages, not a truncated top 20. A short or empty filtered batch can still have a next page.
- The response includes `inspected`, `pagesLoaded`, `nextPage`, `sourceHasMore`, `providerLimitReached` and `unavailable`. These are batch counts, not whole-catalog totals. `inspected` counts unique candidates after genre/decade/director checks.
- The browser reveals four results at a time, then offers **Load more films** to fetch the next candidate batch. It deduplicates film IDs and re-sorts **all accumulated results** after each fetch. Later highly rated films can move above earlier ones.
- IMDb descending order uses TMDb popularity to acquire discovery candidates; no TMDb vote filter, vote minimum or vote sort is used. Title searches retain TMDb's candidate ordering. Date/popularity sorting also covers the accumulated set.
- The UI states that filtering/sorting cover only loaded films. Source exhaustion means accessible candidate pages have been checked, not complete IMDb coverage. A provider page ceiling of 500 is disclosed; users can narrow title/genre/decade/director criteria.
- TMDb pagination is not a stable snapshot: provider updates can move films between pages. Deduplication prevents repeated cards but cannot guarantee gap-free coverage of a moving catalog.
- Director matching retains the existing behavior: select the most relevant directing person from the first TMDb person-search page, name the resolved director, then restrict to Director credits. Director-only results paginate that credit list in groups of 20. Ambiguous names and provider coverage remain limitations.

## Rating states and failures

External film data carries `rating: number | null`, `ratingStatus: rated | unrated | unavailable`, and `ratingSource: imdb`. Details expose `imdbRating` and the same status.

- **rated**: a valid IMDb value greater than zero and at most ten.
- **unrated**: confirmed missing TMDb IMDb mapping, OMDb `N/A`, or an explicit `Movie not found!`. Display **Not rated**.
- **unavailable**: configuration, transport, timeout, HTTP, quota, malformed data, identity mismatch or provider service failure. Display **Temporarily unavailable**, not Not rated.

An active minimum filter (including API value zero) accepts only confirmed ratings at or above the threshold. Unrated and failed values are excluded from that filter and sorted last when no threshold is active. Partial provider failure returns known matches plus an explicit failure count and incomplete-rating warning. The browser preserves cumulative failure counts across loaded pages and offers **Retry search**, which restarts the submitted search from page one. Failed candidates may be missing from threshold results until retry succeeds. A complete rating outage in filtered/ranked discovery returns 502; failed pagination retains the current results and the same next page for retry. Ordinary search and Watchlists remain usable without ratings.

No title fallback is used after an identity failure: guessing by title/year could attribute another film's score. A rejected individual IMDb ID is a lookup failure but does not put unrelated OMDb requests into cooldown.

## Cache and request policy

Reuse the existing `public.film_ratings` table; no new migration is required or applied. Its existing RLS/grants permit only the server-side admin client.

- Confirmed positive ratings live for 24 hours; confirmed missing ratings for one hour. Positive cache entries need a valid IMDb ID. Invalid/future timestamps are rejected.
- Valid persistent rows are reused across process restarts. A bounded 500-entry in-process cache also works when the admin key/cache is unavailable.
- Duplicate concurrent lookups share a promise; at most four rating lookups run per process. This is not a distributed quota limiter.
- Provider requests use an eight-second timeout and `no-store`; cache reads/writes have two-second deadlines. Failed reads/writes do not discard a valid provider result.
- HTTP/network/service failures trigger a 30-second provider cooldown; HTTP Retry-After can extend it. OMDb key/quota errors trigger a one-hour cooldown. The next request after expiry retries. Incorrect individual IDs are not global outages.
- Failures never write a null/missing record or overwrite a successful cache entry, and expired cached scores are not silently served as current.
- Cold broad searches need up to two external requests per candidate (TMDb identity plus OMDb). Even with caching, provider quotas can limit coverage. No global IMDb ranking or fixed response time is promised.

Server configuration: `TMDB_READ_TOKEN`, `OMDB_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL` and optional `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`) for the persistent cache. All provider/admin credentials stay server-side. Search/Watchlist responses contain no keys; The server integration imports `server-only`; shared parsing/display helpers contain no credentials.

## Stored data and personal Reviews

Watchlist reads enrich existing rows with IMDb ratings without rewriting their stored score, source, ID or history. Existing `tmdb`, `imdb` and `legacy` provenance remains accepted on writes for compatibility. New discovery films carry IMDb provenance. Member Review ratings retain their separate 1–10 storage and five-star display; the form says **Your rating**. Membership, invitations, permissions and Review mutation code are unchanged.

TMDb attribution and logo remain in the footer and README.

## Verification

Run `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm build`. Provider tests cover successful/unrated/malformed responses, invalid identities, timeouts, HTTP/key/quota errors, cooldown recovery, cache expiry, cache failures and concurrency. Discovery tests cover threshold boundaries, overflow retention, empty batches, deduplication, source exhaustion, the 500-page ceiling, failure counts, retry semantics and sorting across pages.

Use the existing Insieme local Supabase stack for `supabase test db` and `pnpm test:auth`; do not reset databases to verify this change. Set the isolated preview's `NEXT_PUBLIC_SITE_URL` to its actual port.

For a live API smoke check, set `IMDB_PREVIEW_URL` to the isolated localhost preview and run `node scripts/verify-film-discovery.mjs`. This calls real providers and may consume OMDb quota. Browser checks must cover rating controls, Not rated, partial failures/retry, accumulated ordering and pagination, details, Watchlist ratings, and personal Review separation. Keep mocked browser checks clearly separate from real-provider evidence.

## Verified in the isolated worktree (2026-09-13)

- Implementation commit: `0cb3e1a` (BLA-8), on `codex/imdb-ratings-consistency`. The worktree is `C:/Dev/projects/Insieme-imdb-ratings`; the built preview runs at `http://localhost:3001`.
- 26 unit/regression tests, lint, TypeScript checking and production build passed.
- Existing authentication integration passed: profiles, ownership, invitations, shared history, member Reviews, session persistence, logout and outsider isolation. Both database suites passed (12 assertions).
- The live API check passed validation, IMDb-only payloads, an 8+ threshold, descending rating order, matching details and pagination over two batches of 40 candidates.
- Authenticated desktop/mobile browser checks verified Inception at IMDb 8.8, a separate unrated result, mobile 8+ filtering, adding/marking a film watched, details, and the separate personal five-star rating control. Browser error checks were empty.
- Live provider failures exercised incomplete-rating warnings and retry. A failed page retained existing results and retried the same page; subsequent results re-sorted across 80 checked candidates. Database inspection confirmed a failed identity was absent from the rating cache, while rated and confirmed-unrated rows were present.
- Layout, CSS, card sizing, auth/Review/invitation mutations and database schema were unchanged relative to the local main baseline. Likely design-task overlap: `app/watchlist-search.tsx`, `app/watchlist.tsx` and `app/watchlist-types.ts`. Coordinate the IMDb labels, nullable ratings/status and pagination controls when combining work.
