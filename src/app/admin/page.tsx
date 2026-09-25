import type { Metadata } from "next";
import Link from "next/link";
import { AskTomControls } from "@/components/admin/ask-tom-controls";
import { requireStaff } from "@/lib/auth";
import { getCategoryBySlug, getOpenFlags, getUnansweredOlderThan } from "@/lib/forum/queries";
import { urls } from "@/lib/forum/urls";

export const metadata: Metadata = { title: "Staff", robots: { index: false } };

/* A small staff home. The fuller dashboard is Phase C; this holds what exists now. */
export default async function AdminPage() {
  await requireStaff();
  const [flags, unanswered, askTom] = await Promise.all([getOpenFlags(), getUnansweredOlderThan(48), getCategoryBySlug("ask-tom")]);

  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        <li className="rounded-lg border bg-card p-4">
          <Link href={urls.adminFlags()} className="font-semibold hover:underline">
            Moderation queue
          </Link>
          <p className="text-sm text-muted-foreground">
            {flags.length} open flag{flags.length === 1 ? "" : "s"}, {unanswered.length} topic{unanswered.length === 1 ? "" : "s"} unanswered over 48 hours
          </p>
        </li>
        <li className="rounded-lg border bg-card p-4">
          <Link href="/admin/partners" className="font-semibold hover:underline">
            Partners and placements
          </Link>
          <p className="text-sm text-muted-foreground">Directory entries, sponsor slots, impressions and clicks</p>
        </li>
      </ul>
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Ask Tom</h2>
        {askTom ? (
          <AskTomControls categoryId={askTom.id} accepting={askTom.accepting_topics} note={askTom.accepting_note ?? ""} />
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">The Ask Tom category does not exist yet. Run the seed script.</p>
        )}
      </section>
    </main>
  );
}
