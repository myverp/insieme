alter table public.watchlist_movies
add column watched_at timestamptz;

create index watchlist_movies_watched_at_idx
on public.watchlist_movies (watched_at desc)
where watched_at is not null;

grant update (watched_at) on table public.watchlist_movies to anon;

create policy "Server may mark films watched"
on public.watchlist_movies for update to anon
using (
  encode(
    extensions.digest(
      coalesce((select current_setting('request.headers', true))::jsonb ->> 'x-insieme-secret', ''),
      'sha256'
    ),
    'hex'
  ) = 'cd1b3a1b30a7fbb1527e98075512f882113142af8bc58b275428584f37af1c46'
)
with check (
  watched_at is not null
  and encode(
    extensions.digest(
      coalesce((select current_setting('request.headers', true))::jsonb ->> 'x-insieme-secret', ''),
      'sha256'
    ),
    'hex'
  ) = 'cd1b3a1b30a7fbb1527e98075512f882113142af8bc58b275428584f37af1c46'
);
