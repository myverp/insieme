alter table public.watchlist_movies
add column rating_source text;

update public.watchlist_movies
set rating_source = 'legacy'
where rating_source is null;

alter table public.watchlist_movies
alter column rating_source set default 'tmdb',
alter column rating_source set not null;

alter table public.watchlist_movies
add constraint watchlist_movies_rating_source_check
check (rating_source in ('tmdb', 'imdb', 'legacy'));

create table public.film_ratings (
  tmdb_id bigint primary key check (tmdb_id > 0),
  imdb_id text,
  imdb_rating numeric(3, 1) check (imdb_rating between 0 and 10),
  lookup_status text not null check (lookup_status in ('ok', 'unavailable')),
  fetched_at timestamptz not null default now(),
  constraint film_ratings_imdb_id_format check (imdb_id is null or imdb_id ~ '^tt[0-9]+$'),
  constraint film_ratings_status_value check (
    (lookup_status = 'ok' and imdb_rating is not null)
    or (lookup_status = 'unavailable' and imdb_rating is null)
  )
);

create unique index film_ratings_imdb_id_idx
on public.film_ratings (imdb_id)
where imdb_id is not null;

alter table public.film_ratings enable row level security;

revoke all on table public.film_ratings from public, anon, authenticated;
grant select, insert, update, delete on table public.film_ratings to service_role;
