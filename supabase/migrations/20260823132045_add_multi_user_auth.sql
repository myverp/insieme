alter table public.watchlist_movies
add column user_id uuid references auth.users (id) on delete cascade;

alter table public.watchlist_movies
drop constraint watchlist_movies_pkey;

alter table public.watchlist_movies
add column watchlist_entry_id uuid not null default gen_random_uuid();

alter table public.watchlist_movies
add constraint watchlist_movies_pkey primary key (watchlist_entry_id);

alter table public.watchlist_movies
add constraint watchlist_movies_user_movie_key unique (user_id, id);

-- Existing shared rows have no safe owner to infer. Keep them recoverable but
-- hidden by RLS; this constraint requires every new or changed row to have one.
alter table public.watchlist_movies
add constraint watchlist_movies_user_id_required
check (user_id is not null) not valid;

create index watchlist_movies_user_added_at_idx
on public.watchlist_movies (user_id, added_at);

alter table public.watchlist_movies replica identity full;

drop policy if exists "Shared watchlist is readable" on public.watchlist_movies;
drop policy if exists "Server may add films" on public.watchlist_movies;
drop policy if exists "Server may remove films" on public.watchlist_movies;
drop policy if exists "Server may mark films watched" on public.watchlist_movies;

revoke all on table public.watchlist_movies from anon, authenticated;
grant select, insert, update, delete on table public.watchlist_movies to authenticated;

create policy "Users can view their own films"
on public.watchlist_movies for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their own films"
on public.watchlist_movies for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own films"
on public.watchlist_movies for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own films"
on public.watchlist_movies for delete
to authenticated
using ((select auth.uid()) = user_id);
