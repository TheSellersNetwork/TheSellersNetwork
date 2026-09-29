import Link from "next/link";
import { ArrowRight, Route } from "lucide-react";
import { pathMemberships, type ReadingPath } from "@/lib/content/paths-core";

/*
  "Part of: Starting on Vinted, step 3 of 8. Next: ..." above a guide or post
  that sits in one or more beginner paths.
*/
export function PathBanner({ paths, stepKey }: { paths: ReadingPath[]; stepKey: string }) {
  const memberships = pathMemberships(paths, stepKey);
  if (memberships.length === 0) return null;
  return (
    <aside aria-label="Beginner path" className="mb-6 space-y-2" data-testid="path-banner">
      {memberships.map(({ path, index, next }) => (
        <div key={path.slug} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-brand-soft px-3 py-2 text-sm">
          <Route className="size-4 shrink-0 text-brand" aria-hidden="true" />
          <p>
            Part of{" "}
            <Link href={`/guides/paths/${path.slug}`} className="font-medium underline underline-offset-2">
              {path.title}
            </Link>
            , step {index + 1} of {path.steps.length}
          </p>
          {next ? (
            <Link href={next.href} className="inline-flex min-h-11 items-center gap-1 text-brand underline-offset-2 hover:underline sm:ml-auto sm:min-h-0">
              <span>
                <span className="text-muted-foreground">Next:</span> {next.title}
              </span>
              <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
            </Link>
          ) : (
            <span className="text-muted-foreground sm:ml-auto">Last step in this path</span>
          )}
        </div>
      ))}
    </aside>
  );
}
