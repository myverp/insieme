create extension if not exists pgcrypto with schema extensions;

create table public.watchlist_movies (
  id bigint primary key,
  title text not null check (char_length(title) between 1 and 300),
  year text not null default '',
  poster text not null default '',
  overview text not null default '',
  rating double precision not null default 0 check (rating >= 0 and rating <= 10),
  added_at timestamptz not null default now()
);

alter table public.watchlist_movies enable row level security;
grant select, insert, delete on table public.watchlist_movies to anon;

create policy "Shared watchlist is readable"
on public.watchlist_movies for select to anon using (true);

create policy "Server may add films"
on public.watchlist_movies for insert to anon
with check (
  encode(
    extensions.digest(
      coalesce(current_setting('request.headers', true)::jsonb ->> 'x-insieme-secret', ''),
      'sha256'
    ),
    'hex'
  ) = 'cd1b3a1b30a7fbb1527e98075512f882113142af8bc58b275428584f37af1c46'
);

create policy "Server may remove films"
on public.watchlist_movies for delete to anon
using (
  encode(
    extensions.digest(
      coalesce(current_setting('request.headers', true)::jsonb ->> 'x-insieme-secret', ''),
      'sha256'
    ),
    'hex'
  ) = 'cd1b3a1b30a7fbb1527e98075512f882113142af8bc58b275428584f37af1c46'
);

alter publication supabase_realtime add table public.watchlist_movies;
