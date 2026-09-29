"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Calculator, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export type StartTab = {
  id: string;
  label: string;
  guides: { slug: string; title: string }[];
  tool: { href: string; label: string };
  forum: { href: string; label: string };
};

/*
  Start here, by platform. Pick where you sell and get the guides to read
  first, the right calculator and the forum to ask in. Arrow keys move between
  tabs, as they do in any tab list.
*/
export function StartHere({ tabs }: { tabs: StartTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const tab = tabs.find((t) => t.id === active) ?? tabs[0];
  if (!tab) return null;

  function onKey(e: React.KeyboardEvent, i: number) {
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const t = tabs[(next + tabs.length) % tabs.length];
    setActive(t.id);
    document.getElementById(`start-tab-${t.id}`)?.focus();
  }

  return (
    <section aria-labelledby="start-heading" className="rounded-2xl border bg-card">
      <div className="px-5 pt-5 sm:px-6">
        <h2 id="start-heading" className="text-xl font-semibold tracking-tight">
          Start here
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Pick where you sell. These are the guides to read first, the calculator to use and the forum to ask in.</p>
      </div>
      <div role="tablist" aria-label="Where you sell" className="mt-4 flex gap-1 overflow-x-auto border-b px-5 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            id={`start-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={t.id === tab.id}
            aria-controls="start-panel"
            tabIndex={t.id === tab.id ? 0 : -1}
            onClick={() => setActive(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 pb-2.5 text-sm font-medium transition-colors",
              t.id === tab.id ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id="start-panel" role="tabpanel" aria-labelledby={`start-tab-${tab.id}`} className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_14rem] sm:p-6">
        <ol className="space-y-1">
          {tab.guides.map((g, i) => (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`} className="group flex items-baseline gap-3 rounded-md px-2 py-2 hover:bg-secondary">
                <span className="w-5 shrink-0 text-sm tabular-nums text-muted-foreground">{i + 1}.</span>
                <span className="font-medium group-hover:underline">{g.title}</span>
              </Link>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-2">
          <Link href={tab.tool.href} className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium hover:border-brand/60">
            <Calculator className="size-4 shrink-0 text-brand" aria-hidden="true" />
            {tab.tool.label}
          </Link>
          <Link href={tab.forum.href} className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium hover:border-brand/60">
            <MessagesSquare className="size-4 shrink-0 text-brand" aria-hidden="true" />
            {tab.forum.label}
          </Link>
          <Link href="/guides" className="mt-auto inline-flex items-center gap-1 px-1 pt-2 text-sm text-brand underline-offset-2 hover:underline">
            Every guide <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
