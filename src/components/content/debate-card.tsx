import Link from "next/link";
import { MessagesSquare, Scale } from "lucide-react";
import { DebatePoll } from "@/components/content/debate-poll";
import { Button } from "@/components/ui/button";
import type { Debate } from "@/lib/content/blog-meta";
import { isLive, publishedUkDate } from "@/lib/content/schedule";
import type { Poll } from "@/lib/db/types";
import { formatChangeDate } from "@/lib/tools/changes";

/*
  "Where do you stand?" on a debate blog post. Once the daily cron has opened
  the forum thread it shows the live poll (vote here or in the forum, with a
  plain-English summary of the result) and a link to reply there;
  until then, the question and the date the discussion opens.
*/
export function DebateCard({
  debate,
  published,
  topicUrl,
  poll,
  signedIn,
  returnTo,
  showHeading = true,
}: {
  debate: Debate;
  published: string | null;
  topicUrl: string | null;
  poll: Poll | null;
  signedIn: boolean;
  returnTo: string;
  /* False when the article already ends with its own "Where do you stand?" section. */
  showHeading?: boolean;
}) {
  const opensOn = published && !isLive(published) ? publishedUkDate(published) : null;
  return (
    <section aria-label="Where do you stand?" className="not-prose my-10 rounded-xl border-2 border-brand/40 bg-card p-5">
      {showHeading ? (
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Scale className="size-5 text-brand" aria-hidden="true" /> Where do you stand?
        </h2>
      ) : null}
      {topicUrl ? (
        <>
          <div>
            {poll ? (
              <DebatePoll poll={poll} signedIn={signedIn} returnTo={returnTo} />
            ) : (
              <p className="font-medium">{debate.question}</p>
            )}
          </div>
          <Button asChild className="mt-4">
            <Link href={topicUrl}>
              <MessagesSquare data-icon="inline-start" />
              Vote and reply in the forum
            </Link>
          </Button>
        </>
      ) : (
        <>
          <p className="flex items-center gap-2 font-medium">
            {showHeading ? null : <Scale className="size-4 text-brand" aria-hidden="true" />}
            {debate.question}
          </p>
          <ul className="mt-3 space-y-2">
            {debate.options.map((o) => (
              <li key={o} className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                {o}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">{opensOn ? `The discussion opens on ${formatChangeDate(opensOn)}.` : "The discussion opens shortly."}</p>
        </>
      )}
    </section>
  );
}
