"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

function credentials(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string" || !email.includes("@") || password.length < 8) {
    return null;
  }
  return { email: email.trim(), password };
}

function displayName(formData: FormData) {
  const value = formData.get("displayName");
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 80 ? value.trim() : null;
}

export async function login(formData: FormData) {
  const input = credentials(formData);
  const next = safeNext(formData.get("next"));
  if (!input) redirect("/login?error=Enter+a+valid+email+and+a+password+of+at+least+8+characters.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(input);
  if (error) redirect("/login?error=Invalid+email+or+password.");
  redirect(next ?? "/");
}

export async function signup(formData: FormData) {
  const input = credentials(formData);
  const name = displayName(formData);
  const next = safeNext(formData.get("next"));
  if (!input) redirect("/signup?error=Enter+a+valid+email+and+a+password+of+at+least+8+characters.");
  if (!name) redirect("/signup?error=Enter+a+display+name+between+1+and+80+characters.");

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (host ? `${protocol}://${host}` : "http://localhost:3000");
  const confirmationNext = next ?? "/";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...input,
    options: { emailRedirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent(confirmationNext)}`, data: { display_name: name } },
  });

  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  if (data.session) redirect(next ?? "/");
  redirect("/login?message=Check+your+email+to+confirm+your+account.");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function safeNext(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.startsWith("/invite/") && !value.startsWith("//") ? value : null;
}
