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
import { PathBanner } from "@/components/content/path-banner";
import { ArticleEndTracker } from "@/components/content/path-progress";
import { extractShortVersion } from "@/lib/content/article-extras";
import { getPaths } from "@/lib/content/paths";
import { pathMemberships, stepKey } from "@/lib/content/paths-core";

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
  const paths = await getPaths();
  const key = stepKey("guide", guide.slug);
  const inPath = pathMemberships(paths, key).length > 0;

  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <BreadcrumbJsonLd items={[{ name: "Guides", url: urls.guides() }, { name: guide.title, url: urls.guide(guide.slug) }]} />
      {guide.published ? (
        <ArticleJsonLd title={guide.title} description={guide.excerpt} url={urls.guide(guide.slug)} datePublished={guide.published} author={{ name: siteConfig.name, url: `${siteConfig.url}/about` }} />
      ) : null}
      <ReadingProgress targetId="article-body" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article id="article-body">
          <PathBanner paths={paths} stepKey={key} />
          <p className="text-sm text-muted-foreground">
            <Link href={urls.guides()} className="hover:underline">
              Guides
            </Link>
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{guide.title}</h1>
          <p className="mt-3 max-w-prose text-lg text-muted-foreground">{guide.excerpt}</p>
          <div data-glossary className="prose prose-neutral mt-8 max-w-none measure dark:prose-invert prose-a:text-brand">
            <Mdx source={guide.content} anchors />
          </div>
          {inPath ? <ArticleEndTracker stepKey={key} /> : null}
          <InfoDisclaimer className="mt-10" />
          <div className="mt-10 border-t pt-6">
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
        <aside className="space-y-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:max-h-[calc(100vh-var(--header-height)-3rem)] lg:self-start lg:overflow-y-auto">
          <KeyFacts bullets={keyFacts} />
          <TableOfContents headings={headings} />
        </aside>
      </div>
    </main>
  );
}
