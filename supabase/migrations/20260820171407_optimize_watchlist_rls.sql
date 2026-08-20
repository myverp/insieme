alter policy "Server may add films"
on public.watchlist_movies
with check (
  (select encode(
    extensions.digest(
      coalesce(current_setting('request.headers', true)::jsonb ->> 'x-insieme-secret', ''),
      'sha256'
    ),
    'hex'
  )) = 'cd1b3a1b30a7fbb1527e98075512f882113142af8bc58b275428584f37af1c46'
);

alter policy "Server may remove films"
on public.watchlist_movies
using (
  (select encode(
    extensions.digest(
      coalesce(current_setting('request.headers', true)::jsonb ->> 'x-insieme-secret', ''),
      'sha256'
    ),
    'hex'
  )) = 'cd1b3a1b30a7fbb1527e98075512f882113142af8bc58b275428584f37af1c46'
);
