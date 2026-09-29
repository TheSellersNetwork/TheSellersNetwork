"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Check, Flame, Trophy, X } from "lucide-react";
import { calculatorHref, gamePlatformNames, isCorrect, money, nextStreak, parseStreak, pickRound, platformNote, reveal, whyLine, type GamePlatform, type Round } from "@/lib/home/sections/keep-game";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/*
  "Where would you keep more?": an example item and four platforms. Pick
  one, then see what each leaves you after fees, worked out with the same fee
  engine as the calculator. The streak lives in sessionStorage, so it lasts
  for this visit only. The round is chosen after the page loads, so the
  server and browser render the same thing first.
*/

const STREAK_KEY = "tsn-keep-game-streak";

function readStreak(): string | null {
  try {
    return window.sessionStorage.getItem(STREAK_KEY);
  } catch {
    return null;
  }
}

function writeStreak(n: number) {
  try {
    window.sessionStorage.setItem(STREAK_KEY, String(n));
  } catch {
    // Storage blocked: the streak just is not kept.
  }
}

export function KeepGame() {
  const headingId = useId();
  const [round, setRound] = useState<Round | null>(null);
  const [guess, setGuess] = useState<GamePlatform | null>(null);
  const [streak, setStreak] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    // Deferred so the first round is not set inside the effect body.
    queueMicrotask(() => {
      setRound(pickRound());
      setStreak(parseStreak(readStreak()));
    });
  }, []);

  const rows = round && guess ? reveal(round) : null;
  const correct = rows && guess ? isCorrect(rows, guess) : false;

  function choose(p: GamePlatform) {
    if (!round || guess) return;
    const r = reveal(round);
    const n = nextStreak(readStreak(), isCorrect(r, p));
    writeStreak(n);
    setStreak(n);
    setGuess(p);
    requestAnimationFrame(() => resultRef.current?.focus());
  }

  function next() {
    setRound((r) => pickRound(Math.random, r?.item));
    setGuess(null);
    requestAnimationFrame(() => questionRef.current?.focus());
  }

  const notes = round ? round.options.map((p) => ({ p, note: p === "vinted" || p === "etsy" ? platformNote(p) : null })).filter((n) => n.note) : [];

  return (
    <section aria-labelledby={headingId} className="rounded-2xl border bg-card p-5 sm:p-6" data-testid="keep-game">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={headingId} className="text-lg font-semibold">
          Where would you keep more?
        </h2>
        {streak > 0 ? (
          <p className="flex items-center gap-1 text-sm text-muted-foreground" data-testid="keep-streak">
            <Flame className="size-4 text-brand" aria-hidden="true" /> {streak} in a row
          </p>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">An example item, not a real sale. Fees from our calculator, postage left out as the buyer pays it.</p>

      <div className="mt-5 min-h-40">
        {round ? (
          <>
            <p ref={questionRef} tabIndex={-1} className="text-lg font-medium outline-none text-balance sm:text-xl" data-testid="keep-question">
              You sell {round.item.phrase} for {money(round.item.price)}. You paid {money(round.item.cost)}. Where do you keep the most?
            </p>

            {!rows ? (
              <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {round.options.map((p) => (
                  <li key={p}>
                    <button
                      type="button"
                      onClick={() => choose(p)}
                      className="flex min-h-12 w-full items-center justify-center rounded-md border bg-background px-3 py-2 text-center text-sm font-medium transition-colors hover:border-brand/60 focus-visible:border-brand motion-reduce:transition-none"
                    >
                      {gamePlatformNames[p]}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div ref={resultRef} tabIndex={-1} className="mt-4 outline-none" aria-live="polite" data-testid="keep-reveal">
                <p className={cn("flex items-center gap-2 font-medium", correct ? "text-success" : "text-foreground")}>
                  {correct ? <Check className="size-4" aria-hidden="true" /> : <X className="size-4 text-muted-foreground" aria-hidden="true" />}
                  {correct ? "Right." : `Not this time. You picked ${gamePlatformNames[guess!]}.`}
                </p>
                <ol className="mt-3 divide-y rounded-md border bg-background" data-testid="keep-rows">
                  {rows.map((r) => (
                    <li key={r.platform} className={cn("flex items-center gap-3 px-3 py-2.5 text-sm", r.best && "bg-success/10")} data-best={r.best || undefined}>
                      {r.best ? <Trophy className="size-4 shrink-0 text-success" aria-label="Keeps the most" /> : <span className="size-4 shrink-0" aria-hidden="true" />}
                      <span className="flex-1 font-medium">
                        {r.name}
                        {r.platform === guess ? <span className="ml-2 text-xs font-normal text-muted-foreground">your pick</span> : null}
                      </span>
                      <span className="text-right tabular-nums">
                        <span className="block">You keep {money(r.keep)}</span>
                        <span className={cn("block text-xs", r.profit < 0 ? "text-destructive" : "text-muted-foreground")}>profit {money(r.profit)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-sm">{whyLine(rows)}</p>
                {notes.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {notes.map((n) => (
                      <li key={n.p}>
                        {gamePlatformNames[n.p]}: {n.note}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button type="button" onClick={next} className="min-h-11">
                    Next item <ArrowRight data-icon="inline-end" aria-hidden="true" />
                  </Button>
                  <Link href={calculatorHref(round.item)} className="inline-flex min-h-11 items-center text-sm font-medium text-brand underline-offset-4 hover:underline">
                    Open in the calculator
                  </Link>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Loading an example item.</p>
        )}
      </div>
    </section>
  );
}
