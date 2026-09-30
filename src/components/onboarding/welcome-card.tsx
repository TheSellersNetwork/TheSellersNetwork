"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { dismissWelcome } from "@/lib/onboarding/actions";
import type { WelcomeStep } from "@/lib/onboarding/welcome";
import { cn } from "@/lib/utils";

const storageKey = (userId: string) => `welcome-dismissed:${userId}`;
const noSubscribe = () => () => {};

function readDismissed(userId: string): boolean {
  try {
    return !!window.localStorage.getItem(storageKey(userId));
  } catch {
    // Storage blocked: the server copy of the dismissal still applies.
    return false;
  }
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid size-12 shrink-0 place-items-center">
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" stroke="currentColor" className="text-border" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - done / total)}
          className="text-brand transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
        />
      </svg>
      <span className="text-xs font-semibold tabular-nums">
        {done}/{total}
      </span>
    </div>
  );
}

/*
  The welcome checklist card. Steps are worked out on the server from what
  the member has done. Dismissing saves to the profile, and to this browser
  as well in case the profile column is not there yet.
*/
export function WelcomeCard({ userId, steps }: { userId: string; steps: WelcomeStep[] }) {
  const [dismissedNow, setHidden] = useState(false);
  const dismissedBefore = useSyncExternalStore(noSubscribe, () => readDismissed(userId), () => false);
  const hidden = dismissedNow || dismissedBefore;
  const [, start] = useTransition();
  const done = steps.filter((s) => s.done).length;

  if (hidden) return null;

  return (
    <section aria-labelledby="welcome-heading" className="rounded-2xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <ProgressRing done={done} total={steps.length} />
        <div className="min-w-0 flex-1">
          <h2 id="welcome-heading" className="font-semibold">
            Getting started
          </h2>
          <p className="text-sm text-muted-foreground">
            {done} of {steps.length} done
          </p>
        </div>
        <button
          type="button"
          className="-m-1 grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground pointer-coarse:size-11"
          aria-label="Dismiss the getting started checklist"
          onClick={() => {
            try {
              window.localStorage.setItem(storageKey(userId), "1");
            } catch {
              // Nothing to do: the server call below is the main record.
            }
            setHidden(true);
            start(async () => {
              await dismissWelcome();
            });
          }}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <ol className="mt-4 space-y-1">
        {steps.map((s) => (
          <li key={s.id}>
            {s.done ? (
              <p className="flex items-start gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" aria-hidden="true" />
                </span>
                <span className="line-through decoration-muted-foreground/60">
                  {s.label}
                  <span className="sr-only"> (done)</span>
                </span>
              </p>
            ) : (
              <Link href={s.href} className={cn("group flex items-start gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-secondary pointer-coarse:py-2.5")}>
                <span className="mt-0.5 size-5 shrink-0 rounded-full border-2" aria-hidden="true" />
                <span>
                  <span className="font-medium group-hover:underline">{s.label}</span>
                  <span className="block text-xs text-muted-foreground">{s.hint}</span>
                </span>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
