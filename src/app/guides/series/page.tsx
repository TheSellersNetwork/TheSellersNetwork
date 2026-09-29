import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { getSeries } from "@/lib/content/series";
import { urls } from "@/lib/forum/urls";
import { plural } from "@/lib/format";

export const metadata: Metadata = {
  title: "Series",
  description: "Guides and posts that belong together, in reading order: Amazon FBA, Vinted, eBay, money and tax, and live selling.",
  alternates: { canonical: "/guides/series" },
};

export default async function SeriesIndexPage() {
  const series = await getSeries();
  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <BreadcrumbJsonLd items={[{ name: "Guides", url: urls.guides() }, { name: "Series", url: "/guides/series" }]} />
      <p className="text-sm text-muted-foreground">
        <Link href={urls.guides()} className="hover:underline">
          Guides
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Series</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Guides and posts on one subject, in the order they build on each other. Every part links to the one before and after it. For a shorter start, see the{" "}
        <Link href="/guides/paths" className="text-brand underline underline-offset-2">
          beginner paths
        </Link>
        .
      </p>

      {series.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No series yet.</p>
      ) : (
        <>
          <nav aria-label="Series on this page" className="mt-6">
            <ul className="flex flex-wrap gap-2">
              {series.map((s) => (
                <li key={s.slug}>
                  <a href={`#${s.slug}`} className="inline-flex min-h-11 items-center rounded-full border bg-card px-3 text-sm hover:border-brand/60 sm:min-h-8">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-8 space-y-10">
            {series.map((s) => (
              <section key={s.slug} id={s.slug} aria-labelledby={`${s.slug}-heading`} className="scroll-mt-[calc(var(--header-height)+1rem)]" data-testid="series-section">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id={`${s.slug}-heading`} className="text-xl font-semibold tracking-tight">
                    {s.title}
                  </h2>
                  <span className="text-sm text-muted-foreground">{plural(s.parts.length, "part")}</span>
                </div>
                {s.description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{s.description}</p> : null}
                <ol className="mt-4 grid gap-3 sm:grid-cols-2">
                  {s.parts.map((p, i) => (
                    <li key={p.key} className="forum-card relative flex gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-brand/60 focus-within:border-brand/60 motion-reduce:transition-none">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-xs font-medium tabular-nums" aria-hidden="true">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          <span className="sr-only">Part {i + 1}, </span>
                          {p.kind === "guide" ? "Guide" : "Blog post"}
                        </p>
                        <Link href={p.href} className="mt-0.5 block font-semibold leading-snug after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">
                          {p.title}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
