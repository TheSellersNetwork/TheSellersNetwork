"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { londonLocalToInstant } from "@/lib/defamation/deadlines";
import { noticeOutcomes, posterResponses } from "@/lib/defamation/notice";

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

/* A UK wall-clock time from a datetime-local input, stored as an instant. Blank means not done. */
const ukTime = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (!v) return null;
    const instant = londonLocalToInstant(v);
    if (!instant) {
      ctx.addIssue({ code: "custom", message: "Enter a date and time." });
      return z.NEVER;
    }
    return instant.toISOString();
  });

const blankToNull = <T extends string>(values: readonly [T, ...T[]]) =>
  z
    .union([z.literal(""), z.enum(values)])
    .transform((v) => (v === "" ? null : v));

const noticeSchema = z.object({
  id: z.string().uuid(),
  message_id: z.string().uuid(),
  poster_contactable: z.enum(["", "yes", "no"]).transform((v) => (v === "" ? null : v === "yes")),
  poster_notified_at: ukTime,
  complainant_acknowledged_at: ukTime,
  poster_response: blankToNull(posterResponses),
  poster_response_at: ukTime,
  outcome: blankToNull(noticeOutcomes),
  outcome_at: ukTime,
  complainant_informed_at: ukTime,
});

const trackedFields = [
  "poster_contactable",
  "poster_notified_at",
  "complainant_acknowledged_at",
  "poster_response",
  "poster_response_at",
  "outcome",
  "outcome_at",
  "complainant_informed_at",
] as const;
type Tracked = (typeof trackedFields)[number];

function same(a: unknown, b: unknown): boolean {
  if ((a ?? null) === (b ?? null)) return true;
  // Timestamps come back from Postgres in a different format to the one we send.
  if (typeof a === "string" && typeof b === "string") {
    const ta = Date.parse(a);
    const tb = Date.parse(b);
    return !Number.isNaN(ta) && ta === tb;
  }
  return false;
}

/*
  Staff record each step of the defamation process (Schedule paras 2 to 9).
  Nothing is sent from here: staff contact the poster and the complainant
  themselves, then record when. Each change is written to the moderation log.
*/
export async function updateDefamationNotice(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const text = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" ? v : "";
  };
  const parsed = noticeSchema.safeParse(Object.fromEntries(["id", "message_id", ...trackedFields].map((f) => [f, text(f)])));
  if (!parsed.success) return;
  const d = parsed.data;
  const now = new Date().toISOString();
  const next: Record<Tracked, string | boolean | null> = {
    poster_contactable: d.poster_contactable,
    poster_notified_at: d.poster_notified_at,
    complainant_acknowledged_at: d.complainant_acknowledged_at,
    poster_response: d.poster_response,
    // "No reply" is dated by the deadline, so it has no time of its own.
    poster_response_at: d.poster_response && d.poster_response !== "none" ? (d.poster_response_at ?? now) : null,
    outcome: d.outcome,
    outcome_at: d.outcome ? (d.outcome_at ?? now) : null,
    complainant_informed_at: d.complainant_informed_at,
  };

  const supabase = await createClient();
  const { data: current } = await supabase.from("defamation_notices").select(trackedFields.join(", ")).eq("id", d.id).eq("message_id", d.message_id).maybeSingle();
  if (!current) return;
  const before = current as unknown as Record<Tracked, unknown>;
  const changed = trackedFields.filter((f) => !same(before[f], next[f]));
  if (changed.length === 0) return;

  const { error } = await supabase
    .from("defamation_notices")
    .update({ ...next, updated_by: staff.id })
    .eq("id", d.id);
  if (error) return;
  // Staff close the message themselves once the complainant has been told the outcome.
  await supabase.from("contact_messages").update({ status: "in_progress", handled_by: staff.id, handled_at: now }).eq("id", d.message_id).eq("status", "open");
  await supabase.from("moderation_log").insert({
    actor_id: staff.id,
    action: "defamation_notice_updated",
    target_type: "contact_message",
    target_id: d.message_id,
    reason: changed.map((f) => `${f}: ${next[f] ?? "cleared"}`).join("; "),
    metadata: Object.fromEntries(changed.map((f) => [f, { from: before[f] ?? null, to: next[f] }])),
  });
  revalidatePath("/admin/messages");
}
