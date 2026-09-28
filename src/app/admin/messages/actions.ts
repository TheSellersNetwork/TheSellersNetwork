"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "closed"]),
  staff_note: z.string().trim().max(2000).optional(),
});

/* Staff update a message's status and keep a note of what they did, which is our record. */
export async function updateMessage(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const parsed = schema.safeParse({ id: formData.get("id"), status: formData.get("status"), staff_note: formData.get("staff_note") || undefined });
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase
    .from("contact_messages")
    .update({ status: parsed.data.status, staff_note: parsed.data.staff_note ?? null, handled_by: staff.id, handled_at: new Date().toISOString() })
    .eq("id", parsed.data.id);
  await supabase.from("moderation_log").insert({ actor_id: staff.id, action: `contact_${parsed.data.status}`, target_type: "contact_message", target_id: parsed.data.id, reason: parsed.data.staff_note ?? null });
  revalidatePath("/admin/messages");
}
