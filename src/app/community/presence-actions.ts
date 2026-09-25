"use server";

import { createClient } from "@/lib/supabase/server";

/* Heartbeat target. Cheap: one indexed update, nothing returned. */
export async function touchPresence(): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("touch_presence");
}

/* Marks a category as opened, clearing its unread count. */
export async function recordCategoryVisit(userId: string, categoryId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("category_visits").upsert({ user_id: userId, category_id: categoryId, visited_at: new Date().toISOString() }, { onConflict: "user_id,category_id" });
}

export async function recordHomeVisit(userId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("profiles").update({ home_visited_at: new Date().toISOString() }).eq("id", userId);
}
