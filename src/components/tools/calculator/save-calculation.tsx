"use client";

import Link from "next/link";
import { useId, useRef, useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { urls } from "@/lib/forum/urls";
import { saveCalculation } from "@/app/account/calculations/actions";
import { defaultName, openHref, type CalcInputs, type CalcKind } from "./model";

export type SavingState = "signed-out" | "ready" | "unavailable";

/*
  "Save this calculation" for signed-in members, with a name that starts as
  "£20 on eBay". Signed out, it is a link to sign in that comes back to the
  same figures. Hidden until the saved calculations table exists.
*/
export function SaveCalculation({ kind, inputs, saving }: { kind: CalcKind; inputs: CalcInputs; saving?: SavingState }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const field = useRef<HTMLInputElement>(null);
  const id = useId();

  if (!saving || saving === "unavailable" || !(inputs.price > 0)) return null;

  if (saving === "signed-out") {
    return (
      <Button asChild variant="outline" size="sm" className="min-h-11 sm:min-h-8">
        <Link href={urls.login(openHref(kind, inputs))}>
          <Bookmark data-icon="inline-start" aria-hidden="true" />
          Sign in to save
        </Link>
      </Button>
    );
  }

  const suggested = defaultName(kind, inputs);

  function begin() {
    setName(suggested);
    setStatus(null);
    setOpen(true);
    requestAnimationFrame(() => field.current?.select());
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await saveCalculation(kind, inputs, name);
      setStatus(r);
      if (r.ok) setOpen(false);
    });
  }

  return (
    <div className="space-y-2">
      {open ? (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-2" aria-label="Save this calculation">
          <div className="min-w-0 flex-1 space-y-1 sm:max-w-xs">
            <Label htmlFor={`${id}-name`}>Name</Label>
            <Input id={`${id}-name`} ref={field} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={suggested} />
          </div>
          <Button type="submit" size="sm" disabled={pending} className="min-h-11 sm:min-h-8">
            {pending ? "Saving" : "Save"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} className="min-h-11 sm:min-h-8">
            Cancel
          </Button>
        </form>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={begin} className="min-h-11 sm:min-h-8">
          <Bookmark data-icon="inline-start" aria-hidden="true" />
          Save this calculation
        </Button>
      )}
      <p aria-live="polite" className={status ? (status.ok ? "text-sm" : "text-sm text-destructive") : "sr-only"}>
        {status ? (
          <>
            {status.message}{" "}
            {status.ok ? (
              <Link href="/account/calculations" className="underline">
                Your saved calculations
              </Link>
            ) : null}
          </>
        ) : null}
      </p>
    </div>
  );
}
