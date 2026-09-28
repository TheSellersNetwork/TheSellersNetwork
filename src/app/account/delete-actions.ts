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
  // One database transaction moves or removes the posts and deletes the sign-in,
  // so a failure part-way leaves the account exactly as it was.
  const { error } = await admin.rpc("delete_member", { p_user: user.id, p_remove_posts: removePosts });
  if (error) {
    return { ok: false, message: "Something went wrong and nothing was deleted. Try again, or use the contact form and we will do it for you." };
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/?account=deleted");
}
