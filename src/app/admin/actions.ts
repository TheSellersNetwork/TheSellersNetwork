"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";

export type AdminState = { ok: boolean; message: string };

export async function setAskTomWindow(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const parsed = z
    .object({ category_id: z.string().uuid(), accepting: z.enum(["on", "off"]), note: z.string().trim().max(300).optional() })
    .safeParse({ category_id: formData.get("category_id"), accepting: formData.get("accepting"), note: formData.get("note") ?? "" });
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  const user = await getCurrentUser();
  if (!user?.profile.is_staff) return { ok: false, message: "Staff only." };

  const supabase = await createClient();
  const accepting = parsed.data.accepting === "on";
  const { error } = await supabase.from("categories").update({ accepting_topics: accepting, accepting_note: parsed.data.note || null }).eq("id", parsed.data.category_id);
  if (error) return { ok: false, message: friendlyError(error) };

  await supabase.from("moderation_log").insert({ actor_id: user.id, action: accepting ? "ask_tom_open" : "ask_tom_close", target_type: "category", target_id: parsed.data.category_id });
  revalidatePath("/admin");
  revalidatePath("/community/c/ask-tom");
  return { ok: true, message: accepting ? "Ask Tom is open." : "Ask Tom is closed." };
}
