"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/app/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function acceptInvitation(formData: FormData) {
  const token = formData.get("token");
  if (typeof token !== "string" || !UUID.test(token)) redirect("/login?error=Invitation+link+is+invalid.");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);

  const { data: watchlistId, error } = await supabase.rpc("accept_watchlist_invite", { invite_token: token });
  if (error) redirect(`/invite/${token}?error=${encodeURIComponent(error.message)}`);
  const cookieStore = await cookies();
  cookieStore.set("insieme-watchlist", watchlistId, watchlistCookieOptions());
  redirect("/?joined=1");
}

function watchlistCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}
