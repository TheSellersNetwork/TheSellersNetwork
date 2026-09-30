"use client";

import { useSyncExternalStore } from "react";
import { describeServices, formatPostingDate, formatRemaining, nextCutOff, splitRemaining, type CutOff } from "@/lib/tools/christmas-posting";

/*
  Countdown to the next Christmas last posting date, worked out in UK time
  (see src/lib/tools/christmas-posting.ts). It changes once a minute, with no
  animation. With reduced motion it keeps the figure from when the page loaded
  and does not change in place. The box has a fixed minimum height and the
  server renders the same structure, so nothing moves when the browser takes over.
*/

const MINUTE = 60_000;

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribe(onChange: () => void) {
  if (reducedMotion()) return () => {};
  const id = window.setInterval(onChange, 15_000);
  return () => window.clearInterval(id);
}

// Snapshots are whole minutes, so React only re-renders when the figure can change.
const loadMinute = Math.floor(Date.now() / MINUTE);
const minuteNow = () => (reducedMotion() ? loadMinute : Math.floor(Date.now() / MINUTE));

type Props = {
  cutOffs: CutOff[];
  year: number;
  /* The server's clock when the page was built, used until the browser takes over. */
  serverNow: number;
};

export function ChristmasCountdown({ cutOffs, year, serverNow }: Props) {
  const minute = useSyncExternalStore(subscribe, minuteNow, () => Math.floor(serverNow / MINUTE));
  const next = nextCutOff(cutOffs, new Date(minute * MINUTE));

  return (
    <section aria-labelledby="countdown-heading" className="flex min-h-36 flex-col justify-center rounded-xl border bg-card p-5" data-testid="christmas-countdown">
      <h2 id="countdown-heading" className="text-sm font-medium text-muted-foreground">
        Next last posting date
      </h2>
      {next.kind === "upcoming" ? (
        <>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{formatRemaining(splitRemaining(next.msLeft))}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            left for {describeServices(next.cutOff.services)}: post by the end of {formatPostingDate(next.cutOff.date)}, UK time.
          </p>
        </>
      ) : next.kind === "passed" ? (
        <>
          <p className="mt-1 text-xl font-semibold tracking-tight">Every {year} date on this page has passed</p>
          <p className="mt-1 text-sm text-muted-foreground">The last one was {formatPostingDate(next.last)}. Parcels sent now may not arrive before Christmas, so check with the carrier before you promise a date.</p>
        </>
      ) : (
        <>
          <p className="mt-1 text-xl font-semibold tracking-tight">No carrier has announced its {year} dates yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Carriers usually publish them in the autumn. Each one is added here once it appears on the carrier&rsquo;s own website, and the countdown starts then.</p>
        </>
      )}
    </section>
  );
}
