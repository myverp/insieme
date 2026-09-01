begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.film_ratings'::regclass),
  'film_ratings has RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'public.film_ratings', 'select'),
  'anonymous clients cannot read film ratings'
);

select ok(
  not has_table_privilege('authenticated', 'public.film_ratings', 'select'),
  'authenticated clients cannot read film ratings directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.film_ratings', 'insert'),
  'authenticated clients cannot forge film ratings'
);

select ok(
  has_table_privilege('service_role', 'public.film_ratings', 'select,insert,update,delete'),
  'the server role can maintain the cache'
);

select * from finish();
rollback;
