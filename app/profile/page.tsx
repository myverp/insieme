import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { ProfileAvatar } from "./avatar";
import { updateProfile } from "./actions";
import { ensureProfile } from "./data";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  const profile = await ensureProfile(supabase, userId);
  const { error } = await searchParams;
  return <main className="profile-page"><Link href="/" className="back-link">Back to Watchlist</Link><section className="profile-card" aria-labelledby="profile-title"><ProfileAvatar displayName={profile.displayName} /><div><p className="profile-kicker">Profile settings</p><h1 id="profile-title">Your profile</h1></div><form action={updateProfile} className="profile-form"><label htmlFor="display-name">Display name</label><input id="display-name" name="displayName" defaultValue={profile.displayName} maxLength={80} required autoComplete="name" />{error ? <p className="profile-error" role="alert">{error}</p> : null}<button type="submit">Save name</button></form></section></main>;
}
