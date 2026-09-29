import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { PathProgress } from "@/components/content/path-progress";
import { getPaths } from "@/lib/content/paths";
import { urls } from "@/lib/forum/urls";
import { plural } from "@/lib/format";

export const metadata: Metadata = {
  title: "Beginner paths",
  description: "Our guides and posts in reading order for common starting points: Vinted, eBay, Amazon FBA, car boot and charity shop sourcing, and tax.",
  alternates: { canonical: "/guides/paths" },
};

export default async function PathsPage() {
  const paths = await getPaths();
  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <BreadcrumbJsonLd items={[{ name: "Guides", url: urls.guides() }, { name: "Beginner paths", url: "/guides/paths" }]} />
      <p className="text-sm text-muted-foreground">
        <Link href={urls.guides()} className="hover:underline">
          Guides
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Beginner paths</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Our guides and posts in the order we would read them. Tick each one off as you go. Your progress is kept in this browser only.
      </p>

      {paths.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No paths yet.</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {paths.map((p) => (
            <li key={p.slug} className="forum-card relative flex flex-col rounded-xl border bg-card p-5 transition-colors hover:border-brand/60 focus-within:border-brand/60 motion-reduce:transition-none">
              <h2 className="text-lg font-semibold leading-snug">
                <Link href={`/guides/paths/${p.slug}`} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">
                  {p.title}
                </Link>
              </h2>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{p.description}</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <PathProgress steps={p.steps} size={36} />
                <span className="text-xs text-muted-foreground">{plural(p.steps.length, "step")}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
