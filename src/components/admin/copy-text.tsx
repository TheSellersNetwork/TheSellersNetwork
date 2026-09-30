"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/* A read-only block of text with a copy button, for templates staff send by hand. */
export function CopyText({ id, label, text }: { id: string; label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      (document.getElementById(id) as HTMLTextAreaElement | null)?.select();
    }
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium">
          {label}
        </label>
        <Button type="button" size="sm" variant="outline" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <textarea id={id} readOnly value={text} rows={12} className="w-full rounded-md border bg-background p-2 font-mono text-xs" />
    </div>
  );
}
