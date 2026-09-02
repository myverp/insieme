begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

select ok(
  has_column_privilege('authenticated', 'public.watchlists', 'name', 'update'),
  'authenticated users may request Watchlist name updates'
);

select ok(
  not has_column_privilege('authenticated', 'public.watchlists', 'created_by', 'update'),
  'Watchlist ownership cannot be reassigned'
);

select ok(
  has_table_privilege('authenticated', 'public.watchlists', 'delete'),
  'authenticated users may request Watchlist deletion'
);

select ok(
  has_table_privilege('authenticated', 'public.watchlist_members', 'delete'),
  'authenticated users may request membership deletion'
);

select ok(
  exists (select 1 from pg_policy where polrelid = 'public.watchlists'::regclass and polname = 'Owners can rename their Watchlist' and polcmd = 'w'),
  'owner-only rename policy exists'
);

select ok(
  exists (select 1 from pg_policy where polrelid = 'public.watchlists'::regclass and polname = 'Owners can delete their Watchlist' and polcmd = 'd'),
  'owner-only Watchlist delete policy exists'
);

select ok(
  exists (select 1 from pg_policy where polrelid = 'public.watchlist_members'::regclass and polname = 'Members can leave their Watchlist' and polcmd = 'd'),
  'member-only leave policy exists'
);

select * from finish();
rollback;
