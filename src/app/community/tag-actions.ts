"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";
import { isMissingTable } from "@/lib/forum/tag-queries";

const input = z.object({ tagId: z.string().uuid(), follow: z.boolean() });

/* Follow or unfollow a tag. The database only lets members change their own follows. */
export async function setTagFollow(tagId: string, follow: boolean): Promise<{ ok: boolean; message: string }> {
  const parsed = input.safeParse({ tagId, follow });
  if (!parsed.success) return { ok: false, message: "That tag could not be found." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in to follow tags." };
  const supabase = await createClient();
  const { error } = parsed.data.follow
    ? await supabase.from("tag_follows").upsert({ user_id: user.id, tag_id: parsed.data.tagId }, { onConflict: "user_id,tag_id", ignoreDuplicates: true })
    : await supabase.from("tag_follows").delete().eq("user_id", user.id).eq("tag_id", parsed.data.tagId);
  if (error) return { ok: false, message: isMissingTable(error) ? "Following tags is not switched on yet." : friendlyError(error) };
  revalidatePath("/account");
  return { ok: true, message: parsed.data.follow ? "Following. New topics with this tag will show in your notifications." : "Unfollowed." };
}
