# Authentication setup

Insieme uses Supabase Auth with email and password. Browser sessions are stored in cookies by `@supabase/ssr`. Every user has a profile with a required display name, initials avatar, and timestamps. Profiles are created by an Auth trigger, backfilled by the migration, and safely ensured when a signed-in user first opens the app. Every Watchlist has Members, a user can belong to several Watchlists, and RLS authorizes film, watched-history, reviews, and profile visibility through membership. Members can read profiles only for people with whom they share a Watchlist; users can update only their own display name.

## Environment

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`: the project URL from Supabase Connect.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the project's publishable key. Never use a secret or service-role key in a `NEXT_PUBLIC_` variable.
- `NEXT_PUBLIC_SITE_URL`: `http://localhost:3000` locally and the canonical HTTPS origin in production.

Add `${NEXT_PUBLIC_SITE_URL}/auth/confirm` to **Authentication → URL Configuration → Redirect URLs** in Supabase. For cookie-based email confirmation, set the Confirm signup email link to:

```html
{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email
```

Apply all migrations in `supabase/migrations` before enabling the new application code. Existing rows from the former shared-secret list have no safe owner to infer, so they remain preserved but inaccessible. Authenticated users receive a first Watchlist, can create more, switch between them, and invite other users with a private link. Every film and review operation is scoped to a Watchlist membership.

## Local verification

Start Docker Desktop, then run:

```powershell
supabase start
pnpm dev
pnpm test:auth
```

The integration check creates disposable local accounts and verifies redirects, signup, profile creation and editing, cookie persistence, multiple Watchlists, invitation acceptance, shared film/history operations, member names beside reviews, editing restrictions, logout, and outsider RLS isolation.
