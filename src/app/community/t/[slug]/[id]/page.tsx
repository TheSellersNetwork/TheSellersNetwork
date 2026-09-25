import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { CheckCircle2, Eye, Lock, Pin } from "lucide-react";
import { ForumShell } from "@/components/layout/forum-shell";
import { GuideCard } from "@/components/layout/right-rail";
import { PostItem } from "@/components/forum/post-item";
import { ReplySection } from "@/components/forum/reply-section";
import { TopicStaffTools } from "@/components/forum/topic-staff-tools";
import { ReadTracker } from "@/components/forum/read-tracker";
import { LandingTracker } from "@/components/analytics/landing-tracker";
import { EmailSignupCard } from "@/components/marketing/email-signup-card";
import { BreadcrumbJsonLd, TopicJsonLd } from "@/components/seo/json-ld";
import { getCurrentUser } from "@/lib/auth";
import { getCategories, getTopicByShortId } from "@/lib/forum/queries";
import { getGuideForCategory } from "@/lib/content/guides";
import { createClient } from "@/lib/supabase/server";
import { excerpt } from "@/lib/markdown/render";
import { displayName, plural } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import { siteConfig } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/community/t/[slug]/[id]">): Promise<Metadata> {
  const { id } = await params;
  const data = await getTopicByShortId(id);
  if (!data) return {};
  const first = data.posts[0];
  const description = first ? excerpt(first.body_md) : undefined;
  return {
    title: data.topic.title,
    description,
    alternates: { canonical: urls.topic(data.topic) },
    robots: data.topic.is_unlisted ? { index: false, follow: false } : undefined,
    openGraph: {
      title: data.topic.title,
      description,
      type: "article",
      url: urls.topic(data.topic),
      images: [{ url: `${urls.topic(data.topic)}/opengraph-image`, width: 1200, height: 630 }],
    },
  };
}

export default async function TopicPage({ params }: PageProps<"/community/t/[slug]/[id]">) {
  const { slug, id } = await params;
  const viewer = await getCurrentUser();
  const data = await getTopicByShortId(id, viewer?.id);
  if (!data) notFound();
  const { topic, posts, solution } = data;

  // Renamed topics keep working through the short id; send crawlers to the current slug.
  if (topic.slug !== slug) permanentRedirect(urls.topic(topic));

  const [categories, guide] = await Promise.all([getCategories(), getGuideForCategory(topic.category?.slug ?? null)]);
  const category = categories.find((c) => c.id === topic.category_id) ?? null;
  const parent = category?.parent_id ? categories.find((c) => c.id === category.parent_id) : null;

  const supabase = await createClient();
  void supabase.rpc("increment_view_count", { p_topic_id: topic.id });

  const opening = posts[0];
  const replies = posts.slice(1);
  const canReply = !!viewer && (!topic.is_locked || viewer.profile.is_staff);
  const canMarkSolution = !!viewer && (viewer.id === topic.author_id || viewer.profile.is_staff || viewer.profile.trust_level >= 3);

  const toLd = (p: (typeof posts)[number]) => ({
    text: excerpt(p.body_md, 500),
    dateCreated: p.created_at,
    author: { name: displayName(p.author), url: p.author ? `${siteConfig.url}${urls.profile(p.author.username)}` : siteConfig.url },
    upvoteCount: p.like_count,
    url: urls.topic(topic, p.post_number),
  });

  return (
    <ForumShell
      activeCategory={category?.slug ?? null}
      source={urls.topic(topic)}
      rail={<GuideCard guide={guide} />}
    >
      <BreadcrumbJsonLd
        items={[
          { name: "Community", url: urls.community() },
          ...(parent ? [{ name: parent.name, url: urls.category(parent.slug) }] : []),
          ...(category ? [{ name: category.name, url: urls.category(category.slug) }] : []),
          { name: topic.title, url: urls.topic(topic) },
        ]}
      />
      {opening ? (
        <TopicJsonLd
          title={topic.title}
          url={urls.topic(topic)}
          question={toLd(opening)}
          answers={replies.filter((p) => !p.is_deleted && !p.is_hidden).map(toLd)}
          accepted={solution ? toLd(solution) : null}
          dateModified={topic.last_post_at}
        />
      ) : null}
      <ReadTracker postCount={posts.length} />
      <LandingTracker topicId={topic.id} solved={topic.is_solved} signedIn={!!viewer} />

      <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted-foreground">
        <Link href={urls.community()} className="hover:underline">
          Community
        </Link>
        {parent ? (
          <>
            {" / "}
            <Link href={urls.category(parent.slug)} className="hover:underline">
              {parent.name}
            </Link>
          </>
        ) : null}
        {category ? (
          <>
            {" / "}
            <Link href={urls.category(category.slug)} className="hover:underline">
              {category.name}
            </Link>
          </>
        ) : null}
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{topic.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {topic.is_solved ? (
            <span className="inline-flex items-center gap-1 text-success">
              <CheckCircle2 className="size-4" /> Solved
            </span>
          ) : null}
          {topic.is_pinned ? (
            <span className="inline-flex items-center gap-1">
              <Pin className="size-4" /> Pinned
            </span>
          ) : null}
          {topic.is_locked ? (
            <span className="inline-flex items-center gap-1">
              <Lock className="size-4" /> Locked
            </span>
          ) : null}
          <span>{plural(topic.reply_count, "reply", "replies")}</span>
          <span className="inline-flex items-center gap-1">
            <Eye className="size-4" /> {topic.view_count}
          </span>
          {topic.tags.map((t) => (
            <span key={t.id} className="rounded bg-secondary px-1.5 py-0.5 text-xs">
              {t.name}
            </span>
          ))}
          {viewer?.profile.is_staff ? <TopicStaffTools topicId={topic.id} isPinned={topic.is_pinned} isLocked={topic.is_locked} /> : null}
        </div>
      </header>

      <div className="space-y-4">
        {opening ? (
          <PostItem post={opening} topic={topic} viewer={viewer} canMarkSolution={canMarkSolution} isSolution={false} isOpening />
        ) : null}

        {solution ? (
          <section aria-labelledby="solution-heading" className="rounded-lg border-2 border-success/60 bg-card">
            <h2 id="solution-heading" className="flex items-center gap-2 border-b border-success/30 px-4 py-2 text-sm font-semibold text-success">
              <CheckCircle2 className="size-4" /> Solution
            </h2>
            <PostItem post={solution} topic={topic} viewer={viewer} canMarkSolution={canMarkSolution} isSolution framed={false} />
            <div className="border-t p-4">
              <EmailSignupCard source={`${urls.topic(topic)}#solution`} variant="inline" />
            </div>
          </section>
        ) : null}

        {replies.length > 0 ? (
          <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{plural(replies.length, "reply", "replies")}</h2>
        ) : null}
        {replies.map((post) => (
          <PostItem key={post.id} post={post} topic={topic} viewer={viewer} canMarkSolution={canMarkSolution} isSolution={post.id === solution?.id} />
        ))}
      </div>

      <div className="mt-8">
        <ReplySection topicId={topic.id} topicSlug={topic.slug} shortId={topic.short_id} canReply={canReply} isLocked={topic.is_locked} signedIn={!!viewer} emailConfirmed={viewer?.emailConfirmed ?? false} />
      </div>
    </ForumShell>
  );
}
