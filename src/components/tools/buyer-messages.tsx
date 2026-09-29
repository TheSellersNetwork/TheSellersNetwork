"use client";

import Link from "next/link";
import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MESSAGES_CHECKED, fieldLabels, fillTemplate, templates, type FieldId } from "@/lib/tools/buyer-messages";
import { cn } from "@/lib/utils";

/* Buyer message templates: pick a situation, fill in the blanks, copy the reply. Nothing is sent or saved. */

export function BuyerMessages() {
  const [active, setActive] = useState(templates[0].id);
  const [values, setValues] = useState<Partial<Record<FieldId, string>>>({});
  const t = templates.find((x) => x.id === active) ?? templates[0];
  const filled = fillTemplate(t.body, values);
  const gaps = (filled.match(/\[[^\]]+\]/g) ?? []).length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(filled);
      toast("Copied.");
    } catch {
      toast("Could not copy. Select the text and copy it yourself.");
    }
  };

  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="text-sm font-medium">What is the message about?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {templates.map((x) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={x.id === active}
              onClick={() => setActive(x.id)}
              className={cn("min-h-11 rounded-full border px-3 text-sm sm:min-h-9", x.id === active ? "border-brand bg-brand-soft text-foreground" : "bg-card text-muted-foreground hover:text-foreground")}
            >
              {x.title}
            </button>
          ))}
        </div>
      </fieldset>

      <section aria-labelledby="bm-title" className="space-y-5">
        <div>
          <h2 id="bm-title" className="text-lg font-semibold">
            {t.title}
          </h2>
          <p className="text-sm text-muted-foreground">{t.when}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {t.fields.map((f) => (
            <div key={f} className={cn("space-y-1", f === "measurements" && "sm:col-span-2")}>
              <Label htmlFor={`bm-${f}`}>{fieldLabels[f].label}</Label>
              <Input
                id={`bm-${f}`}
                value={values[f] ?? ""}
                inputMode={fieldLabels[f].money || f === "days" ? "decimal" : undefined}
                placeholder={fieldLabels[f].placeholder}
                autoComplete="off"
                onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium" id="bm-reply-label">
              Your reply
            </h3>
            <Button type="button" size="sm" onClick={copy}>
              <Copy className="size-4" aria-hidden="true" />
              Copy reply
            </Button>
          </div>
          <div className="rounded-xl border bg-card p-4 text-sm leading-relaxed whitespace-pre-wrap" data-testid="bm-reply">
            {filled}
          </div>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {gaps ? `${gaps} ${gaps === 1 ? "gap" : "gaps"} in square brackets still to fill in or delete before you send it.` : "No gaps left. Read it through once and add your name before you send it."}
          </p>
        </div>

        {t.tip ? <p className="text-sm">{t.tip}</p> : null}

        {t.rules?.length ? (
          <div className="space-y-2 rounded-xl border p-4">
            <h3 className="text-sm font-semibold">Platform rules</h3>
            <ul className="space-y-2 text-sm">
              {t.rules.map((r) => (
                <li key={r.platform + r.href}>
                  <span className="font-medium">{r.platform}:</span> <span className="text-muted-foreground">{r.rule}</span>{" "}
                  <a href={r.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
                    {r.platform} help
                    <ExternalLink className="size-3" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">Checked on {MESSAGES_CHECKED}. For other platforms, check their own help centre.</p>
          </div>
        ) : null}

        {t.id === "off-platform" ? (
          <p className="text-sm text-muted-foreground">
            Worried a message is a scam? Run through the{" "}
            <Link href="/tools/scam-check" className="underline">
              scam checker
            </Link>
            .
          </p>
        ) : null}
      </section>
    </div>
  );
}
