"use server";

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/*
  Hides the welcome checklist for good. Stored on the profile; if the column
  is not there yet (migration not applied) the card falls back to the
  browser's local storage, so returns whether the server saved it.
*/
export async function dismissWelcome(): Promise<{ saved: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { saved: false };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ welcome_dismissed_at: new Date().toISOString() }).eq("id", user.id);
  return { saved: !error };
}
