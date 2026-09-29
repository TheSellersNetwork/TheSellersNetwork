import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { enGB } from "date-fns/locale";
import { CalendarClock, MessageSquare } from "lucide-react";
import { Mdx, TableOfContents } from "@/components/content/mdx";
import { EmailSignupCard } from "@/components/marketing/email-signup-card";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { extractHeadings, getBlogPost } from "@/lib/content/blog";
import { createClient } from "@/lib/supabase/server";
import { readingTime } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import { siteConfig } from "@/lib/site";
import { getChange } from "@/lib/content/changes";
import { ChangeArticle } from "@/components/changes/change-article";
import { getAuthor } from "@/lib/content/authors";
import { InfoDisclaimer } from "@/components/legal/info-disclaimer";
import { DebateCard } from "@/components/content/debate-card";
import { isScheduled, publishedUkDate } from "@/lib/content/schedule";
import { getPoll } from "@/lib/forum/polls";
import { getCurrentUser } from "@/lib/auth";
import { formatChangeDate } from "@/lib/tools/changes";

/*
  Rendered per request: change and debate posts show the signed-in member's
  poll vote and the live discussion, and a scheduled post goes live on its UK
  publish date (getBlogPost returns null before then in production).
*/
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const change = await getChange(slug);
  if (change) {
    return {
      title: change.title,
      description: change.summary,
      alternates: { canonical: urls.blogPost(change.slug) },
      openGraph: { title: change.title, description: change.summary, type: "article", publishedTime: change.announced ?? change.date },
    };
  }
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
  // Fee and policy change breakdowns live in content/changes and have their own layout.
  const change = await getChange(slug);
  if (change) return <ChangeArticle change={change} />;
  const post = await getBlogPost(slug);
  if (!post) notFound();
  const byline = post.author ? getAuthor(post.author) : null;

  /* The discussion thread is created by scripts/sync-blog.ts and stored in blog_posts. */
  const supabase = await createClient();
  const { data: row } = await supabase.from("blog_posts").select("discussion_topic_id, topic:topics (id, slug, short_id, reply_count)").eq("slug", post.slug).maybeSingle();
  const thread = (row?.topic as unknown as { id: string; slug: string; short_id: string; reply_count: number } | null) ?? null;
  const headings = extractHeadings(post.content);
  const scheduledFor = isScheduled(post.published) ? publishedUkDate(post.published!) : null;

  /* Debate posts: the poll card goes before the sources, or at the end if there are none. */
  const viewer = post.debate ? await getCurrentUser() : null;
  const poll = post.debate && thread ? await getPoll(thread.id, viewer?.id) : null;
  const sourcesAt = post.debate ? post.content.search(/^## Sources\s*$/m) : -1;
  const body = sourcesAt > 0 ? post.content.slice(0, sourcesAt) : post.content;
  const sources = sourcesAt > 0 ? post.content.slice(sourcesAt) : null;

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
          author={{ name: byline ? byline.name : siteConfig.name, url: `${siteConfig.url}/about` }}
          image={post.cover ?? undefined}
        />
      ) : null}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article>
          <header>
            {scheduledFor ? (
              <p className="mb-4 flex items-center gap-2 rounded-lg border-2 border-brand/40 bg-brand/10 px-3 py-2 text-sm font-medium">
                <CalendarClock className="size-4 text-brand" aria-hidden="true" /> Scheduled for {formatChangeDate(scheduledFor)}. Only staff previews show this post until then.
              </p>
            ) : null}
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
              <span className="grid size-9 place-items-center rounded-full bg-secondary font-medium">{byline ? byline.initials : "SN"}</span>
              <div>
                <Link href={byline ? "/about#who-writes-what" : "/about"} className="font-medium hover:underline">
                  {byline ? `By ${byline.name}` : siteConfig.name}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {post.published ? format(new Date(post.published), "d MMMM yyyy", { locale: enGB }) : "Draft"} · {readingTime(post.content)} min read
                </div>
              </div>
            </div>
          </header>
          <div className="prose prose-neutral mt-8 max-w-none measure dark:prose-invert prose-headings:font-sans prose-a:text-brand">
            <Mdx source={body} />
            {post.debate ? (
              <DebateCard
                debate={post.debate}
                published={post.published}
                topicUrl={thread ? urls.topic(thread) : null}
                poll={poll}
                signedIn={!!viewer}
                returnTo={urls.blogPost(post.slug)}
                showHeading={!/^## Where do you stand\??\s*$/m.test(body)}
              />
            ) : null}
            {sources ? <Mdx source={sources} /> : null}
          </div>
          <InfoDisclaimer className="mt-10" />
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
