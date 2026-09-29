import Link from "next/link";
import { ArrowRight, MessagesSquare } from "lucide-react";
import { DebateBandPoll } from "@/components/home/sections/debate-band-poll";
import { getDebateOfTheWeek, type DebateOfTheWeek } from "@/lib/home/sections/debate";
import { urls } from "@/lib/forum/urls";

/*
  Debate of the week: a full-width band with the newest live debate post's
  question and answers. Once the forum thread exists the answers vote, using
  the forum's poll action; before that they are shown as plain chips. Renders
  nothing when no debate is live. Pass `data` to skip loading it here.
*/
export async function DebateBand({ data, returnTo = "/" }: { data?: DebateOfTheWeek | null; returnTo?: string }) {
  const d = data === undefined ? await getDebateOfTheWeek() : data;
  if (!d) return null;
  const headingId = "debate-of-the-week";

  return (
    <section aria-labelledby={headingId} className="border-y bg-card" data-testid="debate-band">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <p className="text-sm font-medium text-brand">Debate of the week</p>
        <h2 id={headingId} className="mt-2 font-serif text-2xl font-semibold leading-tight tracking-tight text-balance sm:text-3xl">
          {d.poll?.question ?? d.debate.question}
        </h2>

        <div className="mt-6">
          {d.poll ? (
            <DebateBandPoll poll={d.poll} signedIn={d.signedIn} returnTo={returnTo} />
          ) : (
            <>
              <ul className="flex flex-wrap gap-2" aria-label="Answers">
                {d.debate.options.map((o) => (
                  <li key={o} className="rounded-full border bg-background px-3 py-1.5 text-sm">
                    {o}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">Voting opens shortly.</p>
            </>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href={urls.blogPost(d.slug)} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-brand underline-offset-4 hover:underline sm:min-h-0">
            Read both sides <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
          {d.topicUrl ? (
            <Link href={d.topicUrl} className="inline-flex min-h-11 items-center gap-1.5 font-medium underline-offset-4 hover:underline sm:min-h-0">
              <MessagesSquare className="size-4 text-muted-foreground" aria-hidden="true" /> Join the discussion
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
