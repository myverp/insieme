import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { ProfileAvatar } from "./avatar";
import { ensureProfile } from "./data";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  const profile = await ensureProfile(supabase, userId);
  const { error, saved } = await searchParams;
  return (
    <main className="profile-page">
      <Link href="/" className="back-link">Back to Watchlist</Link>
      <section className="profile-card" aria-labelledby="profile-title">
        <ProfileAvatar displayName={profile.displayName} />
        <div>
          <p className="profile-kicker">Profile settings</p>
          <h1 id="profile-title">Your profile</h1>
        </div>
        <ProfileForm displayName={profile.displayName} error={error} saved={saved === "1"} />
        <form action={logout} className="profile-logout-form">
          <button type="submit">Log out</button>
        </form>
      </section>
    </main>
  );
}
