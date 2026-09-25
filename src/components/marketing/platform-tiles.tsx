import Link from "next/link";
import { getPlatformTiles } from "@/lib/forum/home-queries";
import { urls } from "@/lib/forum/urls";
import { plural } from "@/lib/format";

/*
  Platform tiles with real counts. Topics are all-time so the number only ever
  grows; a platform with nothing yet says "New" rather than zero.
*/
export async function PlatformTiles() {
  const tiles = await getPlatformTiles();
  if (tiles.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Platforms">
      {tiles.map((t) => (
        <li key={t.slug}>
          <Link href={urls.category(t.slug)} className="forum-card row-enter group flex h-full flex-col rounded-xl border bg-card px-3 py-2.5 transition-colors hover:border-brand/60">
            <span className="flex items-center gap-2 font-semibold">
              <span className="h-3.5 w-1 rounded-full" style={{ background: `var(--cat-${t.colour})` }} aria-hidden="true" />
              <span className="truncate group-hover:underline">{t.label}</span>
            </span>
            <span className="mt-0.5 text-xs text-muted-foreground">
              {plural(t.forums, "forum")}
              {t.topics > 0 ? ` · ${plural(t.topics, "topic")}` : " · New"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
