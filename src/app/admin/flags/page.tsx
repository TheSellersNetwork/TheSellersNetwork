import type { Metadata } from "next";
import Link from "next/link";
import { FlagQueue } from "@/components/admin/flag-queue";
import { TopicList } from "@/components/forum/topic-list";
import { requireStaff } from "@/lib/auth";
import { getOpenFlags, getUnansweredOlderThan } from "@/lib/forum/queries";
import { urls } from "@/lib/forum/urls";

export const metadata: Metadata = { title: "Moderation queue", robots: { index: false } };

export default async function FlagsPage() {
  await requireStaff();
  const [flags, unanswered] = await Promise.all([getOpenFlags(), getUnansweredOlderThan(48)]);

  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Moderation queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agree hides the post and warns the author. Disagree restores it. Ignore closes the flag and leaves the post as it is.
          </p>
        </div>
        <Link href={urls.community()} className="text-sm text-brand underline underline-offset-2 hover:text-brand-deep">
          Back to the community
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">
          Open flags <span className="text-muted-foreground">{flags.length}</span>
        </h2>
        <FlagQueue
          flags={flags.map((f) => ({
            id: f.id,
            reason: f.reason,
            note: f.note,
            created_at: f.created_at,
            reporter: f.reporter ? { username: f.reporter.username, display_name: f.reporter.display_name, trust_level: f.reporter.trust_level } : null,
            post: f.post
              ? {
                  id: f.post.id,
                  body_md: f.post.body_md,
                  is_hidden: f.post.is_hidden,
                  post_number: f.post.post_number,
                  author: f.post.author ? { username: f.post.author.username, display_name: f.post.author.display_name } : null,
                  topic: f.post.topic,
                }
              : null,
          }))}
        />
      </section>

      <section className="mt-12">
        <h2 className="mb-3 text-lg font-semibold">
          Unanswered for over 48 hours <span className="text-muted-foreground">{unanswered.length}</span>
        </h2>
        <TopicList topics={unanswered} emptyMessage="Nothing waiting. Every topic older than two days has a reply." />
      </section>
    </main>
  );
}
