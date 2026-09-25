"use client";

import { useState } from "react";
import { styles, STYLE_COOKIE, type StyleId } from "@/lib/style";
import { cn } from "@/lib/utils";

/*
  Lets a member pick how the forum looks. Stored in a cookie so the server
  renders the chosen style straight away with no flash. Used on /brand and
  on the account page.
*/
/* Applies the choice to the page and remembers it for a year. */
function applyStyle(id: StyleId) {
  document.documentElement.dataset.style = id;
  document.cookie = `${STYLE_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
}

export function StyleSwitcher({ initialStyle, layout = "grid" }: { initialStyle: StyleId; layout?: "grid" | "list" }) {
  const [style, setStyle] = useState<StyleId>(initialStyle);

  function choose(id: StyleId) {
    setStyle(id);
    applyStyle(id);
  }

  return (
    <div className={cn(layout === "grid" ? "grid gap-3 sm:grid-cols-2" : "space-y-2")} role="radiogroup" aria-label="Forum style">
      {styles.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={style === s.id}
          onClick={() => choose(s.id)}
          className={cn(
            "rounded-lg border bg-card p-4 text-left transition-colors hover:border-foreground/30",
            style === s.id && "border-brand ring-2 ring-brand",
          )}
        >
          <div className="font-medium">{s.name}</div>
          <div className="text-sm text-muted-foreground">{s.note}</div>
        </button>
      ))}
    </div>
  );
}
