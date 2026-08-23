# Authentication setup

Insieme uses Supabase Auth with email and password. Browser sessions are stored in cookies by `@supabase/ssr`. Every Watchlist has Members, a user can belong to several Watchlists, and RLS authorizes film and watched-history access through membership.

## Environment

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`: the project URL from Supabase Connect.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the project's publishable key. Never use a secret or service-role key in a `NEXT_PUBLIC_` variable.
- `NEXT_PUBLIC_SITE_URL`: `http://localhost:3000` locally and the canonical HTTPS origin in production.

Add `${NEXT_PUBLIC_SITE_URL}/auth/confirm` to **Authentication → URL Configuration → Redirect URLs** in Supabase. For cookie-based email confirmation, set the Confirm signup email link to:

```html
{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email
```

Apply both migrations in `supabase/migrations` before enabling the new application code. Existing rows from the former shared-secret list have no safe owner to infer, so they remain preserved but inaccessible. Authenticated users receive a first Watchlist, can create more, switch between them, and invite other users with a private link. Every film operation is scoped to a Watchlist membership.

## Local verification

Start Docker Desktop, then run:

```powershell
supabase start
pnpm dev
pnpm test:auth
```

The integration check creates disposable local accounts and verifies redirects, signup, login, cookie persistence, multiple Watchlists, invitation acceptance, shared film/history operations, logout, and outsider RLS isolation.
