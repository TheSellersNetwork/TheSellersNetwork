import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mdx, TableOfContents } from "@/components/content/mdx";
import { EmailSignupCard } from "@/components/marketing/email-signup-card";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { extractHeadings } from "@/lib/content/blog";
import { getGuide, getGuides } from "@/lib/content/guides";
import { urls } from "@/lib/forum/urls";
import { siteConfig } from "@/lib/site";

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

  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <BreadcrumbJsonLd items={[{ name: "Guides", url: urls.guides() }, { name: guide.title, url: urls.guide(guide.slug) }]} />
      {guide.published ? (
        <ArticleJsonLd title={guide.title} description={guide.excerpt} url={urls.guide(guide.slug)} datePublished={guide.published} author={{ name: siteConfig.name, url: `${siteConfig.url}/about` }} />
      ) : null}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article>
          <p className="text-sm text-muted-foreground">
            <Link href={urls.guides()} className="hover:underline">
              Guides
            </Link>
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{guide.title}</h1>
          <p className="mt-3 max-w-prose text-lg text-muted-foreground">{guide.excerpt}</p>
          <div className="prose prose-neutral mt-8 max-w-none measure dark:prose-invert prose-a:text-brand">
            <Mdx source={guide.content} />
          </div>
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
        <aside className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
          <TableOfContents headings={headings} />
        </aside>
      </div>
    </main>
  );
}
