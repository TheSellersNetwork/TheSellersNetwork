"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

/* Heartbeat target. Cheap: one indexed update, nothing returned. */
export async function touchPresence(): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("touch_presence");
}

/* Marks a category as opened, clearing its unread count. */
export async function recordCategoryVisit(_userId: string, categoryId: string): Promise<void> {
  // The session decides whose visit this is, never the caller.
  const user = await getCurrentUser();
  if (!user) return;
  const userId = user.id;
  const supabase = await createClient();
  await supabase.from("category_visits").upsert({ user_id: userId, category_id: categoryId, visited_at: new Date().toISOString() }, { onConflict: "user_id,category_id" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept so existing callers compile; the session decides the user.
export async function recordHomeVisit(_userId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const userId = user.id;
  const supabase = await createClient();
  await supabase.from("profiles").update({ home_visited_at: new Date().toISOString() }).eq("id", userId);
}
