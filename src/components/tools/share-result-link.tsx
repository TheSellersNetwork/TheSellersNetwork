"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sharedQuery, type SharedInputs } from "@/lib/og/calculator-share";

/*
  "Copy link to this result": puts the calculator's inputs in the address bar
  and copies it, so whoever opens the link sees the same figures and the share
  card shows the same result. `extraQuery` adds options only some calculators
  have (?promo=5); `query` replaces the whole query for calculators with their
  own inputs (Amazon FBA, compare two items).
*/
export function ShareResultLink({ inputs, extraQuery, query }: { inputs?: SharedInputs; extraQuery?: string; query?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const q = query ?? [inputs ? sharedQuery(inputs) : "", extraQuery ?? ""].filter(Boolean).join("&");
    const url = `${window.location.origin}${window.location.pathname}${q ? `?${q}` : ""}${window.location.hash}`;
    // Keep the address bar in step, so the link can also be copied from there.
    window.history.replaceState(window.history.state, "", url);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast("The link to this result is now in your address bar. Copy it from there.");
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} className="min-h-11 sm:min-h-8">
      {copied ? <Check data-icon="inline-start" aria-hidden="true" /> : <Link2 data-icon="inline-start" aria-hidden="true" />}
      {copied ? "Link copied" : "Copy link to this result"}
    </Button>
  );
}
