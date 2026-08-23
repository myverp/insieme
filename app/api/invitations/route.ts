import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { ensureWatchlists, selectWatchlist } from "@/app/lib/watchlist";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  try {
    const input = (await request.json().catch(() => ({}))) as { watchlistId?: string };
    const watchlists = await ensureWatchlists(supabase, userId);
    const watchlist = selectWatchlist(watchlists, input.watchlistId ?? request.cookies.get("insieme-watchlist")?.value);
    const { data, error } = await supabase
      .from("watchlist_invite_links")
      .insert({ watchlist_id: watchlist.id, created_by: userId })
      .select("token")
      .single();
    if (error) throw error;

    return NextResponse.json({ url: `${request.nextUrl.origin}/invite/${data.token}` });
  } catch (error) {
    console.error("Invitation link error", error);
    return NextResponse.json({ error: "The invitation link could not be created." }, { status: 502 });
  }
}
