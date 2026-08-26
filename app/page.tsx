import Watchlist from "./watchlist";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { ensureWatchlists, selectWatchlist } from "@/app/lib/watchlist";
import { ensureProfile } from "@/app/profile/data";

export default async function Home({ searchParams }: { searchParams: Promise<{ joined?: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  const profile = await ensureProfile(supabase, userId);
  let watchlists;
  try {
    watchlists = await ensureWatchlists(supabase, userId);
  } catch (error) {
    if (hasCode(error, "23503")) redirect("/auth/reset-session");
    throw error;
  }
  const cookieStore = await cookies();
  const watchlist = selectWatchlist(watchlists, cookieStore.get("insieme-watchlist")?.value);
  const { joined } = await searchParams;

  return <Watchlist watchlists={watchlists} watchlistId={watchlist.id} joined={joined === "1"} profile={profile} />;
}

function hasCode(error: unknown, code: string): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
