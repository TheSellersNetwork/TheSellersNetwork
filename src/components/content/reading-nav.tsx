import Link from "next/link";
import { ArrowLeft, ArrowRight, Library, Route } from "lucide-react";
import type { ReadingPath } from "@/lib/content/paths-core";
import { readingNavLines, seriesMemberships, type Series } from "@/lib/content/series-core";

/*
  One box above a guide or post that says where it sits: "Part 3 of 8 in
  Amazon FBA from zero" for each series and "step 2 of 8" for each beginner
  path, with the next part. Replaces the separate path banner, so an article
  in both a series and a path shows a single, combined box.
*/
export function ReadingNav({
  series,
  paths,
  stepKey,
}: {
  series: Series[];
  paths: ReadingPath[];
  stepKey: string;
}) {
  const lines = readingNavLines(series, paths, stepKey);
  if (lines.length === 0) return null;
  const hasPath = lines.some((l) => l.kind === "path");
  return (
    <aside
      aria-label={hasPath ? "Series and beginner paths" : "Series"}
      className="mb-6 divide-y rounded-lg border bg-brand-soft text-sm print:hidden"
      data-testid="reading-nav"
    >
      {lines.map((line) => {
        const Icon = line.kind === "series" ? Library : Route;
        return (
          <div
            key={`${line.kind}:${line.slug}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2"
            data-testid={line.kind === "series" ? "series-chip" : "path-banner"}
          >
            <div className="flex min-w-0 items-start gap-2">
              <Icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
              {line.kind === "series" ? (
                <p>
                  Part {line.position} of {line.total} in{" "}
                  <Link href={line.href} className="font-medium underline underline-offset-2">
                    {line.title}
                  </Link>
                </p>
              ) : (
                <p>
                  Beginner path{" "}
                  <Link href={line.href} className="font-medium underline underline-offset-2">
                    {line.title}
                  </Link>
                  , step {line.position} of {line.total}
                </p>
              )}
            </div>
            {line.sameNext ? null : line.next ? (
              <Link
                href={line.next.href}
                className="inline-flex min-h-11 items-center gap-1 text-brand underline-offset-2 hover:underline sm:ml-auto sm:min-h-0"
              >
                <span>
                  <span className="text-muted-foreground">Next:</span> {line.next.title}
                </span>
                <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
              </Link>
            ) : (
              <span className="text-muted-foreground sm:ml-auto">
                Last {line.kind === "series" ? "part" : "step"}
              </span>
            )}
          </div>
        );
      })}
    </aside>
  );
}

/* Previous and next cards at the end of an article in a series. */
export function SeriesPrevNext({ series, stepKey }: { series: Series[]; stepKey: string }) {
  const memberships = seriesMemberships(series, stepKey);
  if (memberships.length === 0) return null;
  return (
    <div className="mt-10 space-y-6 print:hidden" data-testid="series-prev-next">
      {memberships.map(({ series: s, index, previous, next }) => (
        <nav key={s.slug} aria-label={`${s.title}: previous and next`}>
          <p className="text-sm text-muted-foreground">
            Part {index + 1} of {s.parts.length} in{" "}
            <Link
              href={`/guides/series#${s.slug}`}
              className="font-medium text-foreground underline underline-offset-2"
            >
              {s.title}
            </Link>
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {previous ? (
              <Link
                href={previous.href}
                rel="prev"
                className="forum-card group flex flex-col rounded-lg border bg-card p-4 transition-colors hover:border-brand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              >
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowLeft className="size-3.5" aria-hidden="true" /> Previous, part {index}
                </span>
                <span className="mt-1 font-semibold leading-snug group-hover:underline">
                  {previous.title}
                </span>
              </Link>
            ) : (
              <div className="hidden sm:block" aria-hidden="true" />
            )}
            {next ? (
              <Link
                href={next.href}
                rel="next"
                className="forum-card group flex flex-col rounded-lg border bg-card p-4 text-right transition-colors hover:border-brand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              >
                <span className="inline-flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  Next, part {index + 2} <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
                <span className="mt-1 font-semibold leading-snug group-hover:underline">
                  {next.title}
                </span>
              </Link>
            ) : (
              <p className="flex items-center rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                This is the last part.{" "}
                <Link
                  href={`/guides/series#${s.slug}`}
                  className="ml-1 text-brand underline underline-offset-2"
                >
                  See the whole series
                </Link>
              </p>
            )}
          </div>
        </nav>
      ))}
    </div>
  );
}
