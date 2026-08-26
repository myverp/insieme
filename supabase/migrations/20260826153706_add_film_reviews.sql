create table public.film_reviews (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null,
  film_id bigint not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  rating smallint check (rating between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint film_reviews_watchlist_film_fkey
    foreign key (watchlist_id, film_id)
    references public.watchlist_movies (watchlist_id, id)
    on delete cascade,
  constraint film_reviews_member_film_key
    unique (watchlist_id, film_id, user_id)
);

create index film_reviews_user_id_idx
on public.film_reviews (user_id);

alter table public.film_reviews enable row level security;

revoke all on table public.film_reviews from anon, authenticated;
grant select, insert, delete on table public.film_reviews to authenticated;
grant update (body, rating, updated_at) on table public.film_reviews to authenticated;

create policy "Members can view Watchlist reviews"
on public.film_reviews for select
to authenticated
using (
  exists (
    select 1
    from public.watchlist_members member
    where member.watchlist_id = film_reviews.watchlist_id
      and member.user_id = (select auth.uid())
  )
);

create policy "Members can add their review for watched films"
on public.film_reviews for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.watchlist_members member
    where member.watchlist_id = film_reviews.watchlist_id
      and member.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.watchlist_movies movie
    where movie.watchlist_id = film_reviews.watchlist_id
      and movie.id = film_reviews.film_id
      and movie.watched_at is not null
  )
);

create policy "Members can update their review"
on public.film_reviews for update
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.watchlist_members member
    where member.watchlist_id = film_reviews.watchlist_id
      and member.user_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.watchlist_members member
    where member.watchlist_id = film_reviews.watchlist_id
      and member.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.watchlist_movies movie
    where movie.watchlist_id = film_reviews.watchlist_id
      and movie.id = film_reviews.film_id
      and movie.watched_at is not null
  )
);

create policy "Members can delete their review"
on public.film_reviews for delete
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.watchlist_members member
    where member.watchlist_id = film_reviews.watchlist_id
      and member.user_id = (select auth.uid())
  )
);
