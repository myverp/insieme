grant update (name), delete on table public.watchlists to authenticated;
grant delete on table public.watchlist_members to authenticated;

create policy "Owners can rename their Watchlist"
on public.watchlists for update
to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

create policy "Owners can delete their Watchlist"
on public.watchlists for delete
to authenticated
using (created_by = (select auth.uid()));

create policy "Members can leave their Watchlist"
on public.watchlist_members for delete
to authenticated
using (
  user_id = (select auth.uid())
  and role = 'member'
);
