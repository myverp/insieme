import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./avatar";

type ProfileRow = { user_id: string; display_name: string };

export async function ensureProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from("profiles").select("user_id,display_name").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (data) return toProfile(data as ProfileRow);
  const { data: created, error: createError } = await supabase
    .from("profiles").insert({ user_id: userId, display_name: "Member" }).select("user_id,display_name").single();
  if (createError) throw createError;
  return toProfile(created as ProfileRow);
}

export function toProfile(row: ProfileRow): Profile {
  return { userId: row.user_id, displayName: row.display_name };
}
