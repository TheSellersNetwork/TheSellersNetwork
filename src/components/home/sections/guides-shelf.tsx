import Link from "next/link";
import { GuidesShelfView } from "@/components/home/sections/guides-shelf-view";
import { getGuidesShelf } from "@/lib/home/sections/guides-shelf";
import { urls } from "@/lib/forum/urls";

/*
  Guides shelf: covers for the first three beginner paths (or the three
  biggest topics when there are no paths), with a "Continue" card for a
  reader part way through a path. Renders nothing when there are no guides.
*/
export async function GuidesShelf() {
  const { groups, paths, byPath } = await getGuidesShelf();
  if (groups.length === 0) return null;

  return (
    <section aria-labelledby="guides-shelf-heading" data-testid="guides-shelf">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id="guides-shelf-heading" className="text-2xl font-semibold tracking-tight">
            Guides
          </h2>
          <p className="mt-1 text-muted-foreground">{byPath ? "Beginner paths, in the order you will need them." : "Short, practical guides by topic."}</p>
        </div>
        <Link href={urls.guides()} className="inline-flex min-h-11 items-center text-sm text-brand underline-offset-2 hover:underline sm:min-h-0">
          All guides
        </Link>
      </div>
      <GuidesShelfView groups={groups} paths={paths} byPath={byPath} />
    </section>
  );
}
