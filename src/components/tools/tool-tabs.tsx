"use client";

import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type ToolTab = { id: string; label: string; content: React.ReactNode };

/*
  Tabs for the tool pages that hold more than one tool. The chosen tab is kept
  in the address as ?tab=<id> so a link opens on the same tab. Every panel stays
  mounted and the inactive ones are hidden, so numbers typed into one tool are
  still there after a look at another. Arrow keys, Home and End move between
  tabs, as they do in any tab list.
*/
export function ToolTabs({ tabs, initial, label = "Tools on this page" }: { tabs: ToolTab[]; initial?: string; label?: string }) {
  const params = useSearchParams();
  const known = (id: string | null | undefined): id is string => !!id && tabs.some((t) => t.id === id);
  const fromUrl = params.get("tab");
  const active = known(fromUrl) ? fromUrl : known(initial) ? initial : tabs[0]?.id;

  function choose(id: string, focus = false) {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url);
    const button = document.getElementById(`tool-tab-${id}`);
    if (focus) button?.focus();
    button?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function onKey(e: React.KeyboardEvent, i: number) {
    const last = tabs.length - 1;
    const next = e.key === "ArrowRight" ? (i === last ? 0 : i + 1) : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next === null) return;
    e.preventDefault();
    choose(tabs[next].id, true);
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            id={`tool-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={t.id === active}
            aria-controls={`tool-panel-${t.id}`}
            tabIndex={t.id === active ? 0 : -1}
            onClick={() => choose(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 pb-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              t.id === active ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} id={`tool-panel-${t.id}`} role="tabpanel" aria-labelledby={`tool-tab-${t.id}`} tabIndex={0} hidden={t.id !== active} className="rounded-sm pt-6">
          {t.content}
        </div>
      ))}
    </div>
  );
}
