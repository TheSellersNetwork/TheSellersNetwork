"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { voteDeal } from "@/app/community/deal-actions";
import { cn } from "@/lib/utils";

type Props = { topicId: string; valid: number; expired: number; mine: "valid" | "expired" | null; expiresAt: string | null; signedIn: boolean };

/* "Still valid?" for deals. One vote per member, click again to remove it. */
export function DealVotes({ topicId, valid, expired, mine, expiresAt, signedIn }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState({ valid, expired, mine });
  const expiredByDate = expiresAt ? new Date(expiresAt) < new Date() : false;

  function vote(v: "valid" | "expired") {
    if (!signedIn) {
      toast("Sign in to vote.");
      return;
    }
    const next = state.mine === v ? null : v;
    setState((s) => ({
      valid: s.valid + (v === "valid" ? (next ? 1 : -1) : s.mine === "valid" ? -1 : 0),
      expired: s.expired + (v === "expired" ? (next ? 1 : -1) : s.mine === "expired" ? -1 : 0),
      mine: next,
    }));
    start(async () => {
      const r = await voteDeal(topicId, next);
      if (!r.ok) {
        toast.error(r.message);
        router.refresh();
      }
    });
  }

  return (
    <div className="forum-card flex flex-wrap items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm">
      <span className="font-medium">Still valid?</span>
      <Button size="sm" variant={state.mine === "valid" ? "default" : "outline"} onClick={() => vote("valid")} disabled={pending} aria-pressed={state.mine === "valid"}>
        <CheckCircle2 className="size-4" /> Yes, {state.valid}
      </Button>
      <Button size="sm" variant={state.mine === "expired" ? "default" : "outline"} onClick={() => vote("expired")} disabled={pending} aria-pressed={state.mine === "expired"}>
        <XCircle className="size-4" /> Expired, {state.expired}
      </Button>
      {expiresAt ? (
        <span className={cn("ml-auto text-xs", expiredByDate ? "text-destructive" : "text-muted-foreground")}>
          {expiredByDate ? "Ended" : "Ends"} {new Date(expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </span>
      ) : null}
    </div>
  );
}
