import Link from "next/link";
import { notFound } from "next/navigation";
import { acceptInvitation } from "@/app/invite/actions";
import { createClient } from "@/app/lib/supabase/server";
import { InsiemeLogo } from "@/app/logo";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  if (!UUID.test(token)) notFound();
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const next = `/invite/${token}`;

  return (
    <main className="auth-shell">
      <section className="auth-card invitation-card">
        <div className="auth-brand"><InsiemeLogo /></div>
        <h1>Join a shared Watchlist</h1>
        <p className="invitation-copy">You’ve been invited to discover and save films together.</p>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        {data?.claims?.sub ? (
          <form action={acceptInvitation}>
            <input type="hidden" name="token" value={token} />
            <button type="submit">Join Watchlist</button>
          </form>
        ) : (
          <div className="invitation-auth-actions">
            <Link className="primary-link" href={`/login?next=${encodeURIComponent(next)}`}>Log in to join</Link>
            <Link href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link>
          </div>
        )}
      </section>
    </main>
  );
}
