import Link from "next/link";
import { login } from "@/app/auth/actions";
import { AuthForm } from "@/app/auth/form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; next?: string }> }) {
  const { error, message, next } = await searchParams;
  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";
  return (
    <AuthForm title="Welcome back" action={login} submitLabel="Log in" error={error} message={message} next={next}>
      <p>New to Insieme? <Link href={signupHref}>Create an account</Link></p>
    </AuthForm>
  );
}
