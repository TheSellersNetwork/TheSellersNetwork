"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HOME_PLATFORMS, homePlatformCookie, type HomePlatform } from "@/lib/home/sections/platform";
import { cn } from "@/lib/utils";

/*
  "I sell on: All · eBay · Vinted · Amazon · Car boots". Stores the choice in
  a cookie (a functional preference, not tracking) and refreshes the server
  components so the page reorders around it. Works with the keyboard as a
  row of toggle buttons; the pressed one is the current choice.
*/
export function PlatformSwitcher({ value, className }: { value: HomePlatform; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(value);

  function choose(platform: HomePlatform) {
    if (platform === current) return;
    startTransition(() => {
      setCurrent(platform);
      document.cookie = homePlatformCookie(platform, window.location.protocol === "https:");
      router.refresh();
    });
  }

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3", className)} data-testid="platform-switcher">
      <span id="platform-switcher-label" className="text-sm font-medium">
        I sell on:
      </span>
      <div
        role="group"
        aria-labelledby="platform-switcher-label"
        aria-busy={pending || undefined}
        className="flex max-w-full overflow-x-auto rounded-lg border bg-card p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {HOME_PLATFORMS.map((p) => {
          const on = p.id === current;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => choose(p.id)}
              className={cn(
                "min-h-11 shrink-0 whitespace-nowrap rounded-md px-2.5 text-sm sm:px-3 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:min-h-9",
                on ? "bg-brand text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
