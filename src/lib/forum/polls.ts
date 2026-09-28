import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Poll } from "@/lib/db/types";

export const POLL_MAX_OPTIONS = 6;

/* Clean up the options typed into the new-topic form: trimmed, no blanks, no repeats. */
export function parsePollInput(question: FormDataEntryValue | null, options: FormDataEntryValue[], days: FormDataEntryValue | null) {
  const q = String(question ?? "").trim();
  const seen = new Set<string>();
  const labels = options
    .map((o) => String(o).trim().slice(0, 80))
    .filter((o) => o && !seen.has(o.toLowerCase()) && seen.add(o.toLowerCase()));
  if (!q && labels.length === 0) return { poll: null, error: null };
  if (q.length < 3) return { poll: null, error: "Give the poll a question." };
  if (labels.length < 2) return { poll: null, error: "A poll needs at least two answers." };
  if (labels.length > POLL_MAX_OPTIONS) return { poll: null, error: `Up to ${POLL_MAX_OPTIONS} answers per poll.` };
  const n = Number(days);
  const closesAt = Number.isFinite(n) && n > 0 ? new Date(Date.now() + Math.min(n, 90) * 86_400_000).toISOString() : null;
  return { poll: { question: q.slice(0, 200), labels, closesAt }, error: null };
}

export async function getPoll(topicId: string, viewerId?: string | null): Promise<Poll | null> {
  const supabase = await createClient();
  const { data: poll } = await supabase
    .from("polls")
    .select("id, topic_id, question, closes_at, poll_options (id, position, label)")
    .eq("topic_id", topicId)
    .maybeSingle();
  if (!poll) return null;

  const [{ data: results }, mine] = await Promise.all([
    supabase.rpc("poll_results", { p_poll_id: poll.id }),
    viewerId ? supabase.from("poll_votes").select("option_id").eq("poll_id", poll.id).eq("user_id", viewerId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const counts = new Map(((results ?? []) as { option_id: string; votes: number }[]).map((r) => [r.option_id, r.votes]));
  const options = ((poll.poll_options ?? []) as { id: string; position: number; label: string }[])
    .sort((a, b) => a.position - b.position)
    .map((o) => ({ ...o, votes: counts.get(o.id) ?? 0 }));

  return {
    id: poll.id as string,
    topic_id: poll.topic_id as string,
    question: poll.question as string,
    closes_at: poll.closes_at as string | null,
    options,
    total: options.reduce((sum, o) => sum + o.votes, 0),
    myOptionId: (mine.data?.option_id as string | undefined) ?? null,
    isOpen: !poll.closes_at || new Date(poll.closes_at as string).getTime() > Date.now(),
  };
}
