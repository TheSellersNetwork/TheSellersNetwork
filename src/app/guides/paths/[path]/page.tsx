import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { PathProgress, PathStepList } from "@/components/content/path-progress";
import { getPath, getPaths } from "@/lib/content/paths";
import { urls } from "@/lib/forum/urls";

export async function generateStaticParams() {
  return (await getPaths()).map((p) => ({ path: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/paths/[path]">): Promise<Metadata> {
  const { path } = await params;
  const p = await getPath(path);
  if (!p) return {};
  return { title: `${p.title}: beginner path`, description: p.description, alternates: { canonical: `/guides/paths/${p.slug}` } };
}

export default async function PathPage({ params }: PageProps<"/guides/paths/[path]">) {
  const { path } = await params;
  const p = await getPath(path);
  if (!p) notFound();
  const others = (await getPaths()).filter((o) => o.slug !== p.slug);

  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: "Guides", url: urls.guides() },
          { name: "Beginner paths", url: "/guides/paths" },
          { name: p.title, url: `/guides/paths/${p.slug}` },
        ]}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href={urls.guides()} className="hover:underline">
          Guides
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href="/guides/paths" className="hover:underline">
          Beginner paths
        </Link>
      </nav>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{p.title}</h1>
      {p.description ? <p className="mt-2 text-muted-foreground">{p.description}</p> : null}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y py-3">
        <PathProgress steps={p.steps} />
        <p className="text-xs text-muted-foreground">Steps tick themselves when you reach the end of each one. Saved in this browser only.</p>
      </div>

      <div className="mt-6">
        <PathStepList steps={p.steps} />
      </div>

      {others.length > 0 ? (
        <section aria-labelledby="other-paths" className="mt-12">
          <h2 id="other-paths" className="font-semibold">
            Other paths
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/guides/paths/${o.slug}`} className="inline-flex min-h-11 items-center rounded-full border bg-card px-3.5 text-sm hover:border-brand/60 sm:min-h-9">
                  {o.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
