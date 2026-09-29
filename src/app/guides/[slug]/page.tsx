import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mdx, TableOfContents } from "@/components/content/mdx";
import { EmailSignupCard } from "@/components/marketing/email-signup-card";
import { InfoDisclaimer } from "@/components/legal/info-disclaimer";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { extractHeadings } from "@/lib/content/blog";
import { getGuide, getGuides } from "@/lib/content/guides";
import { urls } from "@/lib/forum/urls";
import { siteConfig } from "@/lib/site";
import { KeyFacts } from "@/components/content/key-facts";
import { ReadingProgress } from "@/components/content/reading-progress";
import { ReadingNav, SeriesPrevNext } from "@/components/content/reading-nav";
import { GuideChangelog } from "@/components/content/guide-changelog";
import { PrintButton } from "@/components/content/print-button";
import { PrintMeta } from "@/components/content/print-meta";
import { RelatedThreads } from "@/components/content/related-threads";
import { formatDay, lastUpdated } from "@/lib/content/guide-changes";
import { publishedUkDate } from "@/lib/content/schedule";
import { getSeries } from "@/lib/content/series";
import { ArticleEndTracker } from "@/components/content/path-progress";
import { extractShortVersion } from "@/lib/content/article-extras";
import { getPaths } from "@/lib/content/paths";
import { pathMemberships, stepKey } from "@/lib/content/paths-core";

/* Regenerated at most every five minutes so "Recent questions about this" stays fresh. */
export const revalidate = 300;

export async function generateStaticParams() {
  return (await getGuides()).map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) return {};
  return { title: guide.title, description: guide.excerpt, alternates: { canonical: urls.guide(guide.slug) } };
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) notFound();
  const headings = extractHeadings(guide.content);
  const keyFacts = extractShortVersion(guide.content);
  const [paths, series] = await Promise.all([getPaths(), getSeries()]);
  const key = stepKey("guide", guide.slug);
  const inPath = pathMemberships(paths, key).length > 0;
  const publishedDay = guide.published ? publishedUkDate(guide.published) : null;
  const updatedDay = lastUpdated(guide.changes, guide.published);

  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <BreadcrumbJsonLd items={[{ name: "Guides", url: urls.guides() }, { name: guide.title, url: urls.guide(guide.slug) }]} />
      {guide.published ? (
        <ArticleJsonLd title={guide.title} description={guide.excerpt} url={urls.guide(guide.slug)} datePublished={guide.published} author={{ name: siteConfig.name, url: `${siteConfig.url}/about` }} />
      ) : null}
      <ReadingProgress targetId="article-body" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article id="article-body">
          <ReadingNav series={series} paths={paths} stepKey={key} />
          <p className="text-sm text-muted-foreground print:hidden">
            <Link href={urls.guides()} className="hover:underline">
              Guides
            </Link>
          </p>
          <PrintMeta path={urls.guide(guide.slug)} published={publishedDay ? formatDay(publishedDay) : null} updated={updatedDay ? formatDay(updatedDay) : null} />
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{guide.title}</h1>
          <p className="mt-3 max-w-prose text-lg text-muted-foreground">{guide.excerpt}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {updatedDay ? (
              <a href="#what-changed" className="underline-offset-2 hover:underline" data-testid="guide-updated">
                Updated <time dateTime={updatedDay}>{formatDay(updatedDay)}</time>
              </a>
            ) : null}
            <PrintButton />
          </div>
          <div data-glossary className="prose prose-neutral mt-8 max-w-none measure dark:prose-invert prose-a:text-brand">
            <Mdx source={guide.content} anchors />
          </div>
          {inPath ? <ArticleEndTracker stepKey={key} /> : null}
          <SeriesPrevNext series={series} stepKey={key} />
          <GuideChangelog changes={guide.changes} />
          <RelatedThreads categories={guide.categories} />
          <InfoDisclaimer className="mt-10" />
          <div className="mt-10 border-t pt-6 print:hidden">
            <EmailSignupCard source={urls.guide(guide.slug)} variant="inline" />
            {guide.module && process.env.NEXT_PUBLIC_SHOW_COURSE === "true" ? (
              <p className="mt-4 text-sm text-muted-foreground">
                This is covered in more depth in the course.{" "}
                <Link href={`/course#${guide.module}`} className="text-brand underline underline-offset-2 hover:text-brand-deep">
                  See the module
                </Link>
              </p>
            ) : null}
          </div>
        </article>
        <aside className="space-y-6 print:hidden lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:max-h-[calc(100vh-var(--header-height)-3rem)] lg:self-start lg:overflow-y-auto">
          <KeyFacts bullets={keyFacts} />
          <TableOfContents headings={headings} />
        </aside>
      </div>
    </main>
  );
}
