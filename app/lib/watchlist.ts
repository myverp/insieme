import type { SupabaseClient } from "@supabase/supabase-js";

export type Watchlist = { id: string; name: string };

export async function listWatchlists(supabase: SupabaseClient, userId: string): Promise<Watchlist[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from("watchlist_members")
    .select("watchlist_id")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });
  if (membershipError) throw membershipError;

  const ids = memberships.map((membership) => membership.watchlist_id);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("watchlists")
    .select("id,name")
    .in("id", ids);
  if (error) throw error;

  const byId = new Map((data as Watchlist[]).map((watchlist) => [watchlist.id, watchlist]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

export async function ensureWatchlists(supabase: SupabaseClient, userId: string): Promise<Watchlist[]> {
  const existing = await listWatchlists(supabase, userId);
  if (existing.length) return existing;

  const { data: watchlistId, error } = await supabase.rpc("create_watchlist", { list_name: "My Watchlist" });
  if (error || !watchlistId) throw error ?? new Error("The Watchlist could not be created.");

  return [{ id: watchlistId, name: "My Watchlist" }];
}

export function selectWatchlist(watchlists: Watchlist[], preferredId?: string): Watchlist {
  const selected = watchlists.find((watchlist) => watchlist.id === preferredId) ?? watchlists[0];
  if (!selected) throw new Error("No Watchlist is available.");
  return selected;
}
