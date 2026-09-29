import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sortMilestones, type Milestone } from "@/app/community/u/milestone-rules";

/* A member's milestones, newest first. `available` is false until the milestones migration is applied. */
export async function getMilestones(userId: string): Promise<{ available: boolean; items: Milestone[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_milestones")
    .select("id, label, happened_on")
    .eq("user_id", userId)
    .order("happened_on", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(10);
  if (error) return { available: false, items: [] };
  return { available: true, items: sortMilestones((data ?? []) as Milestone[]) };
}
