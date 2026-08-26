import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { ensureWatchlists, selectWatchlist } from "@/app/lib/watchlist";
import { ensureProfile, toProfile } from "@/app/profile/data";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  await ensureProfile(supabase, userId);
  const watchlists = await ensureWatchlists(supabase, userId);
  const watchlist = selectWatchlist(watchlists, request.cookies.get("insieme-watchlist")?.value);
  const { data: memberships, error: memberError } = await supabase.from("watchlist_members").select("user_id").eq("watchlist_id", watchlist.id);
  if (memberError) return unavailable();
  const { data: profiles, error } = await supabase.from("profiles").select("user_id,display_name").in("user_id", memberships.map((member) => member.user_id));
  if (error) return unavailable();
  return NextResponse.json({ profiles: profiles.map(toProfile) }, { headers: { "Cache-Control": "no-store" } });
}

function unavailable() { return NextResponse.json({ error: "Profiles are temporarily unavailable." }, { status: 502 }); }
