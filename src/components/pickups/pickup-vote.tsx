"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { votePickup } from "@/app/community/pickups/actions";
import { plural } from "@/lib/format";
import { voteShare } from "@/lib/pickups-comments";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  price: string;
  yes: number;
  no: number;
  mine: boolean | null;
  mode: "member" | "own" | "signed-out";
};

/*
  "Would you have bought it at that price?" Members answer first, then see
  how everyone else answered, and can change their answer. The poster sees
  the results but cannot vote on their own pickup.
*/
export function PickupVote({ id, price, yes: initialYes, no: initialNo, mine: initialMine, mode }: Props) {
  const [state, setState] = useState({ yes: initialYes, no: initialNo, mine: initialMine });
  const [pending, start] = useTransition();
  const share = voteShare(state.yes, state.no);
  const showResults = mode === "own" || state.mine !== null;

  function vote(wouldBuy: boolean) {
    start(async () => {
      const r = await votePickup(id, wouldBuy);
      if (r.ok) setState({ yes: r.yes ?? 0, no: r.no ?? 0, mine: r.mine ?? wouldBuy });
      else toast(r.message ?? "That did not work.");
    });
  }

  return (
    <section aria-labelledby={`vote-${id}`} className="mt-6 rounded-xl border bg-card p-4">
      <h2 id={`vote-${id}`} className="font-semibold">
        Would you have bought it at {price}?
      </h2>

      {mode === "member" ? (
        <div role="group" aria-label="Your answer" className="mt-3 flex gap-2">
          {[true, false].map((answer) => (
            <button
              key={String(answer)}
              type="button"
              disabled={pending}
              aria-pressed={state.mine === answer}
              onClick={() => vote(answer)}
              className={cn(
                "inline-flex h-9 min-w-20 items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors hover:border-brand/60 disabled:opacity-60 motion-reduce:transition-none pointer-coarse:h-11",
                state.mine === answer && "border-brand bg-brand-soft text-brand",
              )}
            >
              {answer ? "Yes" : "No"}
            </button>
          ))}
        </div>
      ) : null}

      {showResults ? (
        share ? (
          <div className="mt-3 space-y-2" aria-live="polite">
            {[
              { label: "Yes", pct: share.yes, n: state.yes },
              { label: "No", pct: share.no, n: state.no },
            ].map((row) => (
              <div key={row.label} className="text-sm">
                <div className="flex justify-between tabular-nums">
                  <span>{row.label}</span>
                  <span>
                    {row.pct}% <span className="text-muted-foreground">({row.n})</span>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                  <div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              {plural(share.total, "member has", "members have")} answered.
              {mode === "member" ? " You can change your answer." : ""}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No answers yet.</p>
        )
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signed-out" ? (
            <>
              <Link href={`/login?next=${encodeURIComponent(`/community/pickups/${id}`)}`} className="text-brand underline underline-offset-2 hover:text-brand-deep">
                Sign in
              </Link>{" "}
              to answer and see the results.
            </>
          ) : (
            "Answer to see how other members answered."
          )}
          {share ? ` ${plural(share.total, "member has", "members have")} answered so far.` : ""}
        </p>
      )}
    </section>
  );
}
