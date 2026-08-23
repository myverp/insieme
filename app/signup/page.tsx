import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { AuthForm } from "@/app/auth/form";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  return (
    <AuthForm title="Create your account" action={signup} submitLabel="Sign up" error={error} next={next}>
      <p>Already have an account? <Link href={loginHref}>Log in</Link></p>
    </AuthForm>
  );
}
