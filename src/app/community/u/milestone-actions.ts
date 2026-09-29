"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { allowAction } from "@/lib/rate-limit";
import { friendlyError } from "@/lib/errors";
import { MILESTONE_MAX, validateMilestone } from "@/app/community/u/milestone-rules";

export type MilestoneState = { ok: boolean; message: string; nonce?: number };

function dbMessage(message: string): string | null {
  if (message.includes("too_many_milestones")) return `You can share up to ${MILESTONE_MAX} milestones. Delete one to add another.`;
  if (message.includes("milestone_in_future")) return "Pick a date that has already happened.";
  if (message.includes("profile_milestones_no_links")) return "No links please.";
  return null;
}

/* Adds a milestone, or edits one when an id is sent. Members only change their own (RLS enforces it too). */
export async function saveMilestone(_prev: MilestoneState, formData: FormData): Promise<MilestoneState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in first." };
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const date = String(formData.get("happened_on") ?? "");
  const invalid = validateMilestone(label, date);
  if (invalid) return { ok: false, message: invalid };
  if (id && !/^[0-9a-f-]{36}$/.test(id)) return { ok: false, message: "That milestone could not be found." };
  if (!(await allowAction(`milestone:${user.id}`, 30, "1 hour"))) return { ok: false, message: "Slow down a little." };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("profile_milestones").update({ label, happened_on: date }).eq("id", id).eq("user_id", user.id)
    : await supabase.from("profile_milestones").insert({ user_id: user.id, label, happened_on: date });
  if (error) return { ok: false, message: dbMessage(error.message) ?? friendlyError(error) };
  revalidatePath(`/community/u/${user.profile.username}`);
  return { ok: true, message: id ? "Milestone updated." : "Milestone added.", nonce: Date.now() };
}

export async function deleteMilestone(id: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in first." };
  if (!/^[0-9a-f-]{36}$/.test(id)) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("profile_milestones").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath(`/community/u/${user.profile.username}`);
  return { ok: true };
}
