import Link from "next/link";
import { getChanges } from "@/lib/content/changes";
import { effectiveStatus, formatChangeDate, platformColours, platformLabels } from "@/lib/tools/changes";

/* The three most recent fee and policy changes, for the forum's right rail. */
export async function LatestChanges() {
  const changes = (await getChanges()).slice(0, 3);
  if (changes.length === 0) return null;
  return (
    <section aria-labelledby="latest-changes-heading" className="forum-card rail-card rounded-lg border bg-card p-4 text-sm">
      <h2 id="latest-changes-heading" className="font-semibold">
        Fee and policy changes
      </h2>
      <ul className="mt-2 space-y-3">
        {changes.map((c) => (
          <li key={c.slug} className="flex gap-2">
            <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: `var(--cat-${platformColours[c.platform]})` }} aria-hidden="true" />
            <div>
              <Link href={`/blog/${c.slug}`} className="font-medium leading-snug hover:underline">
                {c.title}
              </Link>
              <p className="text-xs text-muted-foreground">
                {platformLabels[c.platform]} · {effectiveStatus(c) === "coming" ? `starts ${formatChangeDate(c.date)}` : formatChangeDate(c.date)}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <Link href="/blog?type=changes" className="mt-3 inline-block text-brand underline underline-offset-2 hover:text-brand-deep">
        All changes, explained
      </Link>
    </section>
  );
}
