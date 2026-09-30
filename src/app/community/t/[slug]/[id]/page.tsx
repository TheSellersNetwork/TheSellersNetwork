import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Eye, Lock, Pin } from "lucide-react";
import { ForumShell } from "@/components/layout/forum-shell";
import { GuideCard } from "@/components/layout/right-rail";
import { PostItem } from "@/components/forum/post-item";
import { AcceptedAnswer } from "@/components/forum/accepted-answer";
import { QuoteSelection } from "@/components/forum/quote-selection";
import { ReplySection } from "@/components/forum/reply-section";
import { TopicStaffTools } from "@/components/forum/topic-staff-tools";
import { StatusChip } from "@/components/forum/status-chip";
import { TopicTagsCard } from "@/components/forum/topic-tags-card";
import { getFollowedTagIds, tagFollowsAvailable } from "@/lib/forum/tag-queries";
import { ReadTracker } from "@/components/forum/read-tracker";
import { LandingTracker } from "@/components/analytics/landing-tracker";
import { LiveBar } from "@/components/forum/live-bar";
import { DealVotes } from "@/components/forum/deal-votes";
import { PollCard } from "@/components/forum/poll-card";
import { getPoll } from "@/lib/forum/polls";
import { getAnonymousAuthors } from "@/lib/forum/anonymous";
import { getDealOrder, getMyDealVote } from "@/lib/forum/extras-queries";
import { getSiteAccountIds } from "@/lib/forum/overview-queries";
import { WEEKLY_THREADS_SLUG } from "@/lib/rituals";
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
  // A removed opening post leaves nothing worth indexing, even if replies remain.
  const removed = !first || first.is_deleted || first.is_hidden;
  const description = removed ? undefined : excerpt(first.body_md);
  return {
    title: data.topic.title,
    description,
    alternates: { canonical: urls.topic(data.topic) },
    robots: data.topic.is_unlisted ? { index: false, follow: false } : removed ? { index: false, follow: true } : undefined,
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

  const [categories, guide, followedTags, canFollowTags] = await Promise.all([
    getCategories(),
    getGuideForCategory(topic.category?.slug ?? null),
    viewer && topic.tags.length > 0 ? getFollowedTagIds(viewer.id) : Promise.resolve(null),
    !viewer && topic.tags.length > 0 ? tagFollowsAvailable() : Promise.resolve(false),
  ]);
  // Null means the tag_follows table is not there yet, so the follow buttons stay hidden.
  const showTagFollow = viewer ? followedTags !== null : canFollowTags;
  const category = categories.find((c) => c.id === topic.category_id) ?? null;
  const parent = category?.parent_id ? categories.find((c) => c.id === category.parent_id) : null;

  const supabase = await createClient();
  void supabase.rpc("increment_view_count", { p_topic_id: topic.id });

  const opening = posts[0];
  const replies = posts.slice(1);
  const likeLabel = category?.slug === WEEKLY_THREADS_SLUG ? "Kudos" : undefined;
  const isDeal = category?.layout === "deals";
  const dealMeta = isDeal ? (await getDealOrder(category!.id)).get(topic.id) : undefined;
  const myVote = isDeal && viewer ? await getMyDealVote(viewer.id, topic.id) : null;
  const canReply = !!viewer && (!topic.is_locked || viewer.profile.is_staff);
  const [poll, anonymousAuthors, siteAccounts] = await Promise.all([
    getPoll(topic.id, viewer?.id),
    viewer ? getAnonymousAuthors(posts.filter((p) => p.is_anonymous).map((p) => p.id)) : Promise.resolve(new Map<string, { user_id: string; username: string }>()),
    getSiteAccountIds(),
  ]);
  // Google's forum markup is for posts by members, not for what the site itself publishes.
  const memberTopic = !!opening && !opening.is_anonymous ? !siteAccounts.has(opening.author_id) : !!opening;
  const isAnonymousOwner = !!viewer && !!opening?.is_anonymous && anonymousAuthors.get(opening.id)?.user_id === viewer.id;
  const canMarkSolution = !!viewer && (viewer.id === topic.author_id || isAnonymousOwner || viewer.profile.is_staff || viewer.profile.trust_level >= 3);

  const toLd = (p: (typeof posts)[number]) => ({
    text: excerpt(p.body_md, 500),
    datePublished: p.created_at,
    author: p.is_anonymous
      ? { name: "Anonymous member", url: siteConfig.url }
      : { name: displayName(p.author), url: p.author ? `${siteConfig.url}${urls.profile(p.author.username)}` : siteConfig.url },
    likeCount: p.like_count,
    url: urls.topic(topic, p.post_number),
  });

  return (
    <ForumShell
      activeCategory={category?.slug ?? null}
      source={urls.topic(topic)}
      rail={
        <>
          {showTagFollow ? <TopicTagsCard tags={topic.tags} followed={followedTags ?? new Set()} signedIn={!!viewer} /> : null}
          <GuideCard guide={guide} />
        </>
      }
    >
      <BreadcrumbJsonLd
        items={[
          { name: "Community", url: urls.community() },
          ...(parent ? [{ name: parent.name, url: urls.category(parent.slug) }] : []),
          ...(category ? [{ name: category.name, url: urls.category(category.slug) }] : []),
          { name: topic.title, url: urls.topic(topic) },
        ]}
      />
      {opening && memberTopic ? (
        <TopicJsonLd
          title={topic.title}
          url={urls.topic(topic)}
          opening={toLd(opening)}
          replies={replies.filter((p) => !p.is_deleted && !p.is_hidden).map(toLd)}
          accepted={solution ? toLd(solution) : null}
          dateModified={topic.last_post_at}
          forum={category ? { name: category.name, url: urls.category(category.slug) } : null}
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
          <StatusChip topic={topic} size="md" />
          {topic.is_locked && topic.is_solved ? (
            <span className="inline-flex items-center gap-1">
              <Lock className="size-4" aria-hidden="true" /> Locked
            </span>
          ) : null}
          {topic.is_pinned ? (
            <span className="inline-flex items-center gap-1">
              <Pin className="size-4" /> Pinned
            </span>
          ) : null}
          <span>{plural(topic.reply_count, "reply", "replies")}</span>
          <span className="inline-flex items-center gap-1">
            <Eye className="size-4" /> {topic.view_count}
          </span>
          {topic.tags.map((t) => (
            <Link key={t.id} href={urls.tag(t.slug)} className="rounded bg-secondary px-1.5 py-0.5 text-xs hover:underline">
              {t.name}
            </Link>
          ))}
          {viewer?.profile.is_staff ? <TopicStaffTools topicId={topic.id} isPinned={topic.is_pinned} isLocked={topic.is_locked} /> : null}
        </div>
      </header>

      <div className="space-y-4">
        {isDeal ? <DealVotes topicId={topic.id} valid={dealMeta?.valid ?? 0} expired={dealMeta?.expired ?? 0} mine={myVote} expiresAt={topic.expires_at} signedIn={!!viewer} /> : null}
        {poll ? <PollCard poll={poll} signedIn={!!viewer} returnTo={urls.topic(topic)} /> : null}
        {opening ? (
          <PostItem post={opening} topic={topic} viewer={viewer} canMarkSolution={canMarkSolution} isSolution={false} isOpening likeLabel={likeLabel} anonymousAuthor={anonymousAuthors.get(opening.id)} />
        ) : null}

        {solution && !solution.is_deleted && !solution.is_hidden ? (
          <AcceptedAnswer post={solution}>
            <EmailSignupCard source={`${urls.topic(topic)}#solution`} variant="inline" />
          </AcceptedAnswer>
        ) : null}

        {replies.length > 0 ? (
          <h2 className="pt-2 text-sm font-semibold text-muted-foreground">{plural(replies.length, "reply", "replies")}</h2>
        ) : null}
        {replies.map((post) => (
          <PostItem key={post.id} post={post} topic={topic} viewer={viewer} canMarkSolution={canMarkSolution} isSolution={post.id === solution?.id} likeLabel={likeLabel} anonymousAuthor={anonymousAuthors.get(post.id)} />
        ))}
      </div>

      {canReply ? <QuoteSelection /> : null}
      <LiveBar kind="replies" topicId={topic.id} />
      <div className="mt-8">
        <ReplySection allowAnonymous={!!category?.allow_anonymous} topicId={topic.id} topicSlug={topic.slug} shortId={topic.short_id} canReply={canReply} isLocked={topic.is_locked} signedIn={!!viewer} emailConfirmed={viewer?.emailConfirmed ?? false} />
      </div>
    </ForumShell>
  );
}
