"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { BarChart3, Check } from "lucide-react";
import { toast } from "sonner";
import { votePoll } from "@/app/community/actions";
import { longDate, plural } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import type { Poll } from "@/lib/db/types";
import { cn } from "@/lib/utils";

/*
  Results show once you have voted, once the poll has closed, or when you are
  signed out (you cannot vote, so there is nothing to bias). Votes are private;
  only totals are shown.
*/
export function PollCard({ poll, signedIn, returnTo }: { poll: Poll; signedIn: boolean; returnTo: string }) {
  const [pending, startTransition] = useTransition();
  const [state, setOptimistic] = useOptimistic(poll, (current, optionId: string) => {
    const options = current.options.map((o) => {
      let votes = o.votes;
      if (o.id === current.myOptionId) votes -= 1;
      if (o.id === optionId) votes += 1;
      return { ...o, votes };
    });
    return { ...current, options, myOptionId: optionId, total: current.myOptionId ? current.total : current.total + 1 };
  });
  const showResults = !!state.myOptionId || !state.isOpen || !signedIn;

  function vote(optionId: string) {
    if (!signedIn || !state.isOpen || optionId === state.myOptionId) return;
    startTransition(async () => {
      setOptimistic(optionId);
      const result = await votePoll(state.id, optionId);
      if (!result.ok) toast(result.message);
    });
  }

  return (
    <section aria-labelledby={`poll-${state.id}`} className="forum-card rounded-lg border bg-card p-4">
      <h2 id={`poll-${state.id}`} className="flex items-center gap-2 font-semibold">
        <BarChart3 className="size-4 text-brand" aria-hidden="true" />
        {state.question}
      </h2>
      <ul className="mt-3 space-y-2">
        {state.options.map((o) => {
          const pct = state.total > 0 ? Math.round((o.votes / state.total) * 100) : 0;
          const mine = o.id === state.myOptionId;
          return (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => vote(o.id)}
                disabled={!signedIn || !state.isOpen || pending}
                aria-pressed={mine}
                className={cn(
                  "relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  signedIn && state.isOpen ? "hover:border-brand/60" : "cursor-default",
                  mine && "border-brand",
                )}
              >
                {showResults ? (
                  <span className="absolute inset-y-0 left-0 bg-brand/15 transition-[width] duration-500" style={{ width: `${pct}%` }} aria-hidden="true" />
                ) : null}
                <span className="relative flex items-center gap-2">
                  {mine ? <Check className="size-4 text-brand" aria-label="Your vote" /> : null}
                  {o.label}
                </span>
                {showResults ? (
                  <span className="relative tabular-nums text-muted-foreground">
                    {pct}% <span className="sr-only">({plural(o.votes, "vote")})</span>
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
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
        ) : null}
      </p>
    </section>
  );
}
