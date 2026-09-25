"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";

export async function voteDeal(topicId: string, vote: "valid" | "expired" | null): Promise<{ ok: boolean; message: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in to vote." };
  const supabase = await createClient();
  const { error } = vote
    ? await supabase.from("deal_votes").upsert({ user_id: user.id, topic_id: topicId, vote }, { onConflict: "user_id,topic_id" })
    : await supabase.from("deal_votes").delete().eq("user_id", user.id).eq("topic_id", topicId);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/community");
  return { ok: true, message: "" };
}
