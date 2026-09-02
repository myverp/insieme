"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { ensureProfile } from "./data";

export async function updateProfile(formData: FormData) {
  const displayName = formData.get("displayName");
  if (typeof displayName !== "string" || !displayName.trim() || displayName.trim().length > 80) redirect("/profile?error=Enter+a+name+between+1+and+80+characters.");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  await ensureProfile(supabase, userId);
  const { error } = await supabase.from("profiles").update({ display_name: displayName.trim() }).eq("user_id", userId);
  if (error) redirect("/profile?error=Your+profile+could+not+be+updated.");
  revalidatePath("/");
  revalidatePath("/profile");
  redirect("/profile?saved=1");
}
