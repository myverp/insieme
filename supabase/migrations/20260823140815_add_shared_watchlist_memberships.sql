create table public.watchlists (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our watchlist' check (char_length(name) between 1 and 80),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.watchlist_members (
  user_id uuid not null references auth.users (id) on delete cascade,
  watchlist_id uuid not null references public.watchlists (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (watchlist_id, user_id)
);

create table public.watchlist_invite_links (
  token uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references public.watchlists (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz
);

alter table public.watchlists enable row level security;
alter table public.watchlist_members enable row level security;
alter table public.watchlist_invite_links enable row level security;

revoke all on table public.watchlists, public.watchlist_members, public.watchlist_invite_links from anon, authenticated;
grant select, insert on table public.watchlists to authenticated;
grant select, insert on table public.watchlist_members to authenticated;
grant select, insert, update, delete on table public.watchlist_invite_links to authenticated;

create policy "Members can view their Watchlist"
on public.watchlists for select
to authenticated
using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.watchlist_members member
    where member.watchlist_id = id
      and member.user_id = (select auth.uid())
  )
);

create policy "Users can create their Watchlist"
on public.watchlists for insert
to authenticated
with check (created_by = (select auth.uid()));

create policy "Members can view their membership"
on public.watchlist_members for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Creators can join their Watchlist"
on public.watchlist_members for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and exists (
    select 1 from public.watchlists list
    where list.id = watchlist_id
      and list.created_by = (select auth.uid())
  )
);

create policy "Members can view invitation links"
on public.watchlist_invite_links for select
to authenticated
using (
  exists (
    select 1 from public.watchlist_members member
    where member.watchlist_id = watchlist_invite_links.watchlist_id
      and member.user_id = (select auth.uid())
  )
);

create policy "Members can create invitation links"
on public.watchlist_invite_links for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.watchlist_members member
    where member.watchlist_id = watchlist_invite_links.watchlist_id
      and member.user_id = (select auth.uid())
  )
);

create policy "Members can revoke invitation links"
on public.watchlist_invite_links for update
to authenticated
using (
  exists (
    select 1 from public.watchlist_members member
    where member.watchlist_id = watchlist_invite_links.watchlist_id
      and member.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.watchlist_members member
    where member.watchlist_id = watchlist_invite_links.watchlist_id
      and member.user_id = (select auth.uid())
  )
);

create policy "Members can delete invitation links"
on public.watchlist_invite_links for delete
to authenticated
using (
  exists (
    select 1 from public.watchlist_members member
    where member.watchlist_id = watchlist_invite_links.watchlist_id
      and member.user_id = (select auth.uid())
  )
);

-- Preserve each existing user's films by turning their personal collection
-- into the first shared Watchlist that they own.
insert into public.watchlists (created_by)
select user_id
from public.watchlist_movies
where user_id is not null
group by user_id;

insert into public.watchlist_members (user_id, watchlist_id, role)
select created_by, id, 'owner'
from public.watchlists
on conflict (watchlist_id, user_id) do nothing;

alter table public.watchlist_movies
add column watchlist_id uuid references public.watchlists (id) on delete cascade;

update public.watchlist_movies movie
set watchlist_id = list.id
from public.watchlists list
where list.created_by = movie.user_id;

alter table public.watchlist_movies
rename column user_id to added_by;

alter table public.watchlist_movies
drop constraint watchlist_movies_user_movie_key;

alter table public.watchlist_movies
drop constraint watchlist_movies_user_id_required;

alter table public.watchlist_movies
add constraint watchlist_movies_watchlist_movie_key unique (watchlist_id, id);

alter table public.watchlist_movies
add constraint watchlist_movies_membership_required
check (watchlist_id is not null and added_by is not null) not valid;

drop index public.watchlist_movies_user_added_at_idx;

create index watchlist_movies_watchlist_added_at_idx
on public.watchlist_movies (watchlist_id, added_at);

drop policy if exists "Users can view their own films" on public.watchlist_movies;
drop policy if exists "Users can add their own films" on public.watchlist_movies;
drop policy if exists "Users can update their own films" on public.watchlist_movies;
drop policy if exists "Users can delete their own films" on public.watchlist_movies;

create policy "Members can view Watchlist films"
on public.watchlist_movies for select
to authenticated
using (
  exists (
    select 1 from public.watchlist_members member
    where member.watchlist_id = watchlist_movies.watchlist_id
      and member.user_id = (select auth.uid())
  )
);

create policy "Members can add Watchlist films"
on public.watchlist_movies for insert
to authenticated
with check (
  added_by = (select auth.uid())
  and exists (
    select 1 from public.watchlist_members member
    where member.watchlist_id = watchlist_movies.watchlist_id
      and member.user_id = (select auth.uid())
  )
);

create policy "Members can update Watchlist films"
on public.watchlist_movies for update
to authenticated
using (
  exists (
    select 1 from public.watchlist_members member
    where member.watchlist_id = watchlist_movies.watchlist_id
      and member.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.watchlist_members member
    where member.watchlist_id = watchlist_movies.watchlist_id
      and member.user_id = (select auth.uid())
  )
);

create policy "Members can delete Watchlist films"
on public.watchlist_movies for delete
to authenticated
using (
  exists (
    select 1 from public.watchlist_members member
    where member.watchlist_id = watchlist_movies.watchlist_id
      and member.user_id = (select auth.uid())
  )
);

create or replace function public.accept_watchlist_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invited_watchlist_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select link.watchlist_id
  into invited_watchlist_id
  from public.watchlist_invite_links link
  where link.token = invite_token
    and link.revoked_at is null
    and link.expires_at > now();

  if invited_watchlist_id is null then
    raise exception 'Invitation is invalid or expired';
  end if;

  insert into public.watchlist_members (user_id, watchlist_id, role)
  values ((select auth.uid()), invited_watchlist_id, 'member')
  on conflict (watchlist_id, user_id) do nothing;

  return invited_watchlist_id;
end;
$$;

revoke execute on function public.accept_watchlist_invite(uuid) from public, anon;
grant execute on function public.accept_watchlist_invite(uuid) to authenticated;

create or replace function public.create_watchlist(list_name text default 'My Watchlist')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_watchlist_id uuid;
  normalized_name text := nullif(trim(list_name), '');
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if normalized_name is null or char_length(normalized_name) > 80 then
    raise exception 'Watchlist name must contain between 1 and 80 characters';
  end if;

  insert into public.watchlists (name, created_by)
  values (normalized_name, (select auth.uid()))
  returning id into new_watchlist_id;

  insert into public.watchlist_members (user_id, watchlist_id, role)
  values ((select auth.uid()), new_watchlist_id, 'owner');

  return new_watchlist_id;
end;
$$;

revoke execute on function public.create_watchlist(text) from public, anon;
grant execute on function public.create_watchlist(text) to authenticated;
