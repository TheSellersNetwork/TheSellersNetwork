import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { enGB } from "date-fns/locale";
import { MessageSquare } from "lucide-react";
import { Mdx, TableOfContents } from "@/components/content/mdx";
import { EmailSignupCard } from "@/components/marketing/email-signup-card";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { extractHeadings, getBlogPost, getBlogPosts } from "@/lib/content/blog";
import { createClient } from "@/lib/supabase/server";
import { readingTime } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import { siteConfig } from "@/lib/site";

export async function generateStaticParams() {
  return (await getBlogPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: urls.blogPost(post.slug) },
    openGraph: { title: post.title, description: post.excerpt, type: "article", publishedTime: post.published ?? undefined, ...(post.cover ? { images: [post.cover] } : {}) },
  };
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  /* The discussion thread is created by scripts/sync-blog.ts and stored in blog_posts. */
  const supabase = await createClient();
  const { data: row } = await supabase.from("blog_posts").select("discussion_topic_id, topic:topics (slug, short_id, reply_count)").eq("slug", post.slug).maybeSingle();
  const thread = (row?.topic as unknown as { slug: string; short_id: string; reply_count: number } | null) ?? null;
  const headings = extractHeadings(post.content);

  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <BreadcrumbJsonLd items={[{ name: "Blog", url: urls.blog() }, { name: post.title, url: urls.blogPost(post.slug) }]} />
      {post.published ? (
        <ArticleJsonLd
          title={post.title}
          description={post.excerpt}
          url={urls.blogPost(post.slug)}
          datePublished={post.published}
          dateModified={post.updated ?? undefined}
          author={{ name: siteConfig.name, url: `${siteConfig.url}/about` }}
          image={post.cover ?? undefined}
        />
      ) : null}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article>
          <header>
            <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
              {post.platforms.map((p) => (
                <span key={p} className="rounded bg-secondary px-1.5 py-0.5 capitalize">
                  {p}
                </span>
              ))}
            </div>
            <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{post.title}</h1>
            <p className="mt-3 max-w-prose text-lg text-muted-foreground">{post.excerpt}</p>
            <div className="mt-5 flex items-center gap-3 border-y py-3 text-sm">
              <span className="grid size-9 place-items-center rounded-full bg-secondary font-medium">SN</span>
              <div>
                <Link href="/about" className="font-medium hover:underline">
                  {siteConfig.name}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {post.published ? format(new Date(post.published), "d MMMM yyyy", { locale: enGB }) : "Draft"} · {readingTime(post.content)} min read
                </div>
              </div>
            </div>
          </header>
          <div className="prose prose-neutral mt-8 max-w-none measure dark:prose-invert prose-headings:font-sans prose-a:text-brand">
            <Mdx source={post.content} />
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-3 border-t pt-6">
            {thread ? (
              <Button asChild>
                <Link href={urls.topic(thread)}>
                  <MessageSquare data-icon="inline-start" />
                  Discuss this on the forum {thread.reply_count > 0 ? `(${thread.reply_count})` : ""}
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href={urls.community()}>Discuss this on the forum</Link>
              </Button>
            )}
          </div>
          <div className="mt-8">
            <EmailSignupCard source={urls.blogPost(post.slug)} variant="inline" />
          </div>
        </article>
        <aside className="space-y-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
          <TableOfContents headings={headings} />
        </aside>
      </div>
    </main>
  );
}
