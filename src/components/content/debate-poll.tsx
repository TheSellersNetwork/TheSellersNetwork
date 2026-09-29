"use client";

import Link from "next/link";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { BarChart3, Check } from "lucide-react";
import { toast } from "sonner";
import { votePoll } from "@/app/community/actions";
import { longDate, plural } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import { applyVote, summarisePoll } from "@/lib/content/poll-summary";
import type { Poll } from "@/lib/db/types";
import { cn } from "@/lib/utils";

/*
  The debate poll on a blog post. Same rules as the forum's PollCard (results
  show once you have voted, once the poll has closed, or when you are signed
  out) and the same vote action, plus a plain-English summary of the result.
  Bars grow in when the results appear; with reduced motion they are drawn at
  their final width. Below five votes it shows counts, not percentages.
*/
export function DebatePoll({ poll, signedIn, returnTo, headingLevel = 3 }: { poll: Poll; signedIn: boolean; returnTo: string; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const [pending, startTransition] = useTransition();
  /* votePoll revalidates the forum topic, not this post, so keep the saved vote locally. */
  const [saved, setSaved] = useState(poll);
  const [state, setOptimistic] = useOptimistic(saved, (current, optionId: string) => applyVote(current, optionId));
  const showResults = !!state.myOptionId || !state.isOpen || !signedIn;
  const summary = summarisePoll(state);

  /* Start the bars at zero and let them grow once the results are on screen. */
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    if (!showResults) return;
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, [showResults]);

  function vote(optionId: string) {
    if (!signedIn || !state.isOpen || optionId === state.myOptionId) return;
    startTransition(async () => {
      setOptimistic(optionId);
      const result = await votePoll(state.id, optionId);
      if (result.ok) setSaved((s) => applyVote(s, optionId));
      else toast(result.message);
    });
  }

  return (
    <section aria-labelledby={`poll-${state.id}`} className="rounded-lg border bg-card p-4" data-testid="debate-poll">
      <Heading id={`poll-${state.id}`} className="flex items-center gap-2 font-semibold">
        <BarChart3 className="size-4 shrink-0 text-brand" aria-hidden="true" />
        {state.question}
      </Heading>
      <ul className="mt-3 space-y-2">
        {state.options.map((o) => {
          const pct = summary.percent[o.id] ?? 0;
          const mine = o.id === state.myOptionId;
          return (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => vote(o.id)}
                disabled={!signedIn || !state.isOpen || pending}
                aria-pressed={mine}
                className={cn(
                  "relative flex min-h-11 w-full items-center justify-between gap-3 overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition-colors motion-reduce:transition-none",
                  signedIn && state.isOpen ? "hover:border-brand/60" : "cursor-default",
                  mine && "border-brand",
                )}
              >
                {showResults && summary.showPercent ? (
                  <span
                    className={cn("absolute inset-y-0 left-0 transition-[width] duration-700 ease-out motion-reduce:transition-none", mine ? "bg-brand/25" : "bg-brand/15")}
                    style={{ width: grown ? `${pct}%` : "0%" }}
                    aria-hidden="true"
                    data-poll-bar
                  />
                ) : null}
                <span className="relative flex items-center gap-2">
                  {mine ? <Check className="size-4 shrink-0 text-brand" aria-label="Your vote" /> : null}
                  {o.label}
                </span>
                {showResults ? (
                  <span className="relative shrink-0 tabular-nums text-muted-foreground">
                    {summary.showPercent ? (
                      <>
                        {pct}% <span className="sr-only">({plural(o.votes, "vote")})</span>
                      </>
                    ) : (
                      plural(o.votes, "vote")
                    )}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {showResults ? (
        <div className="mt-3 space-y-0.5 text-sm" aria-live="polite" data-testid="poll-summary">
          <p className="font-medium">{summary.headline}</p>
          {summary.agreement ? <p className="text-muted-foreground">{summary.agreement}</p> : null}
        </div>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground">
        {plural(state.total, "vote")}
        {" · "}
        {!state.isOpen ? "Closed" : state.closes_at ? `Closes ${longDate(state.closes_at)}` : "Open"}
        {!signedIn ? (
          <>
            {" · "}
            <Link href={urls.login(returnTo)} className="underline">
              Sign in to vote
            </Link>
          </>
        ) : state.isOpen && state.myOptionId ? (
          " · Tap another answer to change your vote"
        ) : state.isOpen ? (
          " · Vote to see the results"
        ) : null}
      </p>
    </section>
  );
}
