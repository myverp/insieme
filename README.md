# Insieme

Insieme is a shared film watchlist for discovering films, saving possibilities, and deciding what to watch together.

## Why it exists

Choosing a film is often harder than finding one. Insieme keeps the process in one small space: search together, keep a shared shortlist, and move films into watched history when a decision has been made.

## What it does

- Search TMDb by title or filters such as genre, director, decade, minimum score, and sort order.
- Open film details with synopsis, cast, images, trailer availability, and IMDb rating enrichment when available.
- Add and remove films, undo a removal, and mark films as watched.
- Create and switch between named Watchlists, rename or delete lists as their Owner, and leave lists as a Member.
- Invite other people with private links and keep Watchlist access scoped to authenticated Members.
- Maintain initials-based profiles and write one optional 1–10 Review per watched Film in a Watchlist.

## Technical overview

- Next.js App Router, React, TypeScript, and CSS
- Supabase Auth, Postgres, Row Level Security, and Realtime updates
- TMDb for film discovery and OMDb for exact IMDb rating enrichment
- Vercel for deployment

The application uses server-side Supabase clients and `getClaims()` for authenticated requests. Database policies keep films, history, Reviews, profiles, and invitations scoped to Watchlist membership.

## Local setup

### Requirements

Node.js, pnpm, the Supabase CLI, and Docker Desktop for the local database.

### Install and configure

```powershell
pnpm install
Copy-Item .env.example .env.local
```

Set the variables in `.env.local`:

```text
TMDB_READ_TOKEN=...
OMDB_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Never expose a Supabase secret key through a `NEXT_PUBLIC_` variable.

Start the local app with:

```powershell
supabase start
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Verification

Run the checks relevant to your change:

```powershell
pnpm test
pnpm run lint
pnpm exec tsc --noEmit
pnpm run build
supabase test db
pnpm run test:auth
```

The auth check exercises signup, profiles, multiple Watchlists, invitations, shared film and watched-history operations, Reviews, logout, and outsider RLS isolation. It requires the local Supabase stack and the configured environment variables.

## Live demo

[insieme-watchlist.vercel.app](https://insieme-watchlist.vercel.app/)

Film data is provided by [TMDb](https://www.themoviedb.org/). This product uses the TMDb API but is not endorsed or certified by TMDb.
