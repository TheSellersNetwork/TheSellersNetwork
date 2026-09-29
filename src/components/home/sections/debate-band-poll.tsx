"use client";

import Link from "next/link";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { votePoll } from "@/app/community/actions";
import { plural } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import { applyVote, summarisePoll } from "@/lib/content/poll-summary";
import type { Poll } from "@/lib/db/types";
import { cn } from "@/lib/utils";

/*
  The answers in the debate band. Tapping one votes with the forum's poll
  action, then the result bars grow in with the same summary lines as the
  poll on the post. Results show once you have voted or the poll has closed.
  Signed-out visitors get a prompt to join instead. Bars are drawn at their
  final width with reduced motion.
*/
export function DebateBandPoll({ poll, signedIn, returnTo }: { poll: Poll; signedIn: boolean; returnTo: string }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(poll);
  const [state, setOptimistic] = useOptimistic(saved, (current, optionId: string) => applyVote(current, optionId));
  const [askToJoin, setAskToJoin] = useState(false);
  const showResults = !!state.myOptionId || !state.isOpen;
  const summary = summarisePoll(state);

  const [grown, setGrown] = useState(false);
  useEffect(() => {
    if (!showResults) return;
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, [showResults]);

  function choose(optionId: string) {
    if (!state.isOpen || pending || optionId === state.myOptionId) return;
    if (!signedIn) {
      setAskToJoin(true);
      return;
    }
    startTransition(async () => {
      setOptimistic(optionId);
      const result = await votePoll(state.id, optionId);
      if (result.ok) setSaved((s) => applyVote(s, optionId));
      else toast(result.message);
    });
  }

  return (
    <div data-testid="debate-band-poll">
      <ul className="grid gap-2 sm:grid-cols-2">
        {state.options.map((o) => {
          const pct = summary.percent[o.id] ?? 0;
          const mine = o.id === state.myOptionId;
          return (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => choose(o.id)}
                disabled={!state.isOpen || pending}
                aria-pressed={mine}
                className={cn(
                  "relative flex min-h-12 w-full items-center justify-between gap-3 overflow-hidden rounded-md border bg-background px-4 py-2.5 text-left transition-colors motion-reduce:transition-none",
                  state.isOpen ? "hover:border-brand/60" : "cursor-default",
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
                <span className="relative flex items-center gap-2 font-medium">
                  {mine ? <Check className="size-4 shrink-0 text-brand" aria-label="Your vote" /> : null}
                  {o.label}
                </span>
                {showResults ? (
                  <span className="relative shrink-0 text-sm tabular-nums text-muted-foreground">
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

      <div aria-live="polite">
        {showResults ? (
          <div className="mt-4 space-y-0.5 text-sm" data-testid="poll-summary">
            <p className="font-medium">{summary.headline}</p>
            {summary.agreement ? <p className="text-muted-foreground">{summary.agreement}</p> : null}
          </div>
        ) : null}
        {askToJoin && !signedIn ? (
          <p className="mt-4 text-sm" data-testid="join-to-vote">
            <Link href={`${urls.signup()}?next=${encodeURIComponent(returnTo)}`} className="font-medium text-brand underline underline-offset-2">
              Join free to vote
            </Link>
            <span className="text-muted-foreground">
              {" "}
              or{" "}
              <Link href={urls.login(returnTo)} className="underline underline-offset-2">
                sign in
              </Link>
              .
            </span>
          </p>
        ) : null}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {plural(state.total, "vote")}
        {!state.isOpen ? " · Closed" : state.myOptionId ? " · Tap another answer to change your vote" : " · Vote to see the results"}
      </p>
    </div>
  );
}
