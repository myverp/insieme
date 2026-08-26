create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.profile_display_name(user_email text, metadata jsonb)
returns text language sql immutable set search_path = ''
as $$
  select left(coalesce(nullif(btrim(metadata ->> 'display_name'), ''), nullif(split_part(coalesce(user_email, ''), '@', 1), ''), 'Member'), 80);
$$;

create or replace function public.create_profile_for_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, public.profile_display_name(new.email, new.raw_user_meta_data))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_create_profile after insert on auth.users
for each row execute procedure public.create_profile_for_user();

insert into public.profiles (user_id, display_name)
select id, public.profile_display_name(email, raw_user_meta_data) from auth.users
on conflict (user_id) do nothing;

create or replace function public.set_profile_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_profile_updated_at();

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select, insert on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

create schema private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_watchlist_member(target_watchlist_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.watchlist_members where watchlist_id = target_watchlist_id and user_id = (select auth.uid())
  );
$$;

create or replace function private.shares_watchlist_with(profile_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.watchlist_members viewer
    join public.watchlist_members profile_member on profile_member.watchlist_id = viewer.watchlist_id
    where viewer.user_id = (select auth.uid()) and profile_member.user_id = profile_user_id
  );
$$;

revoke execute on function private.is_watchlist_member(uuid), private.shares_watchlist_with(uuid) from public;
grant execute on function private.is_watchlist_member(uuid), private.shares_watchlist_with(uuid) to authenticated;

drop policy "Members can view their membership" on public.watchlist_members;
create policy "Members can view Watchlist memberships" on public.watchlist_members for select to authenticated
using ((select private.is_watchlist_member(watchlist_id)));

create policy "Members can view shared Watchlist profiles" on public.profiles for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.shares_watchlist_with(user_id))
);
create policy "Users can create their missing profile" on public.profiles for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "Users can update their own profile" on public.profiles for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke execute on function public.profile_display_name(text, jsonb) from public;
revoke execute on function public.create_profile_for_user() from public;
revoke execute on function public.set_profile_updated_at() from public;
