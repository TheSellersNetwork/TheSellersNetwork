"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { friendlyError } from "@/lib/errors";

type Result = { ok: boolean; message: string };

/*
  Agree: hide the post, warn the author with a notification, close the flag.
  Disagree: restore the post, close the flag. Ignore: close the flag only.
  Every decision is written to moderation_log.
*/
export async function resolveFlag(flagId: string, decision: "agreed" | "disagreed" | "ignored", reason: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user?.profile.is_staff) return { ok: false, message: "Staff only." };

  const supabase = await createClient();
  const { data: flag, error: flagError } = await supabase
    .from("flags")
    .update({ status: decision, resolved_by: user.id, resolved_at: new Date().toISOString() })
    .eq("id", flagId)
    .select("post_id, post:posts (author_id, topic:topics (title, slug, short_id))")
    .single();
  if (flagError || !flag) return { ok: false, message: friendlyError(flagError) };

  const post = flag.post as unknown as { author_id: string; topic: { title: string; slug: string; short_id: string } | null } | null;

  if (decision === "agreed") {
    await supabase.from("posts").update({ is_hidden: true, hidden_at: new Date().toISOString(), hidden_reason: "staff" }).eq("id", flag.post_id);
    if (post) {
      try {
        const admin = createAdminClient();
        await admin.from("notifications").insert({
          user_id: post.author_id,
          type: "moderation",
          payload: {
            message: `A post of yours was hidden by staff. ${reason || "It broke the house rules."}`,
            topic_title: post.topic?.title,
            topic_slug: post.topic?.slug,
            topic_short_id: post.topic?.short_id,
          },
        });
      } catch {
        // No service key locally; the moderation log still records the warning.
      }
    }
  } else if (decision === "disagreed") {
    const { count } = await supabase.from("flags").select("id", { count: "exact", head: true }).eq("post_id", flag.post_id).eq("status", "open");
    if (!count) {
      await supabase.from("posts").update({ is_hidden: false, hidden_at: null, hidden_reason: null }).eq("id", flag.post_id);
    }
  }

  await supabase.from("moderation_log").insert({
    actor_id: user.id,
    action: `flag_${decision}`,
    target_type: "post",
    target_id: flag.post_id,
    reason: reason || null,
    metadata: { flag_id: flagId },
  });

  revalidatePath("/admin/flags");
  if (post?.topic) revalidatePath(`/community/t/${post.topic.slug}/${post.topic.short_id}`);
  return { ok: true, message: decision === "agreed" ? "Hidden and author warned." : decision === "disagreed" ? "Flag dismissed." : "Flag ignored." };
}
