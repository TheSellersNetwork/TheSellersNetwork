"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowAction } from "@/lib/rate-limit";

export type DeleteState = { ok: boolean; message: string };

/*
  Self-serve account deletion (UK GDPR right to erasure). The member types
  their username to confirm. Their posts either stay, credited to "Deleted
  member", or are removed too, as they choose. Then the profile and sign-in
  are deleted; everything else tied to the account (likes, bookmarks, follows,
  notifications, push subscriptions, setups, anonymous post records) goes
  with it through the database's cascade rules.
*/
export async function deleteAccount(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const user = await requireUser("/account");
  if (String(formData.get("confirm") ?? "").trim().toLowerCase() !== user.profile.username) {
    return { ok: false, message: "Type your username exactly to confirm." };
  }
  if (user.profile.is_staff) return { ok: false, message: "Staff accounts are removed by another member of staff." };
  if (!(await allowAction(`delete-account:${user.id}`, 3, "1 hour"))) return { ok: false, message: "Try again in a little while." };
  const removePosts = formData.get("remove_posts") === "on";

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, message: "Deletion is not available right now. Use the contact form and we will do it for you." };
  }
  const { data: holder } = await admin.from("site_accounts").select("profile_id").eq("key", "deleted").maybeSingle();
  if (!holder) return { ok: false, message: "Deletion is not available right now. Use the contact form and we will do it for you." };
  const deletedId = holder.profile_id as string;

  if (removePosts) {
    await admin.from("posts").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("author_id", user.id).eq("is_deleted", false);
    // Anonymous posts they wrote go too.
    const { data: anon } = await admin.from("anonymous_authors").select("post_id").eq("user_id", user.id);
    const ids = (anon ?? []).map((a) => a.post_id as string);
    if (ids.length) await admin.from("posts").update({ is_deleted: true, deleted_at: new Date().toISOString() }).in("id", ids);
  }

  const steps = [
    admin.from("topics").update({ author_id: deletedId }).eq("author_id", user.id),
    admin.from("topics").update({ last_poster_id: deletedId }).eq("last_poster_id", user.id),
    admin.from("posts").update({ author_id: deletedId }).eq("author_id", user.id),
  ];
  for (const step of steps) {
    const { error } = await step;
    if (error) return { ok: false, message: "Something went wrong. Nothing has been deleted yet; try again or use the contact form." };
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, message: "Something went wrong deleting the sign-in. Use the contact form and we will finish it for you." };

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/?account=deleted");
}
