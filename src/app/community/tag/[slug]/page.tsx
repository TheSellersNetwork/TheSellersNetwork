import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ForumShell } from "@/components/layout/forum-shell";
import { TopicList } from "@/components/forum/topic-list";
import { StatusFilter } from "@/components/forum/status-filter";
import { TagFollowButton } from "@/components/forum/tag-follow-button";
import { getCurrentUser } from "@/lib/auth";
import { getTopics } from "@/lib/forum/queries";
import { getFollowedTagIds, getTagBySlug, getTopicIdsForTag, tagFollowsAvailable } from "@/lib/forum/tag-queries";
import { parseStatus } from "@/lib/forum/status";
import { plural } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import { listIndexing, tagDescription, tagIsIndexable } from "@/lib/forum/seo";

export async function generateMetadata({ params, searchParams }: PageProps<"/community/tag/[slug]">): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const tag = await getTagBySlug(slug);
  if (!tag) return {};
  const title = `${tag.name}: forum topics for UK sellers`;
  const description = tagDescription(tag.name, tag.topic_count);
  return {
    title,
    description,
    // A tag on only a topic or two is a thin page; it is indexed once it has a few.
    ...listIndexing(urls.tag(tag.slug), sp, tagIsIndexable(tag)),
    openGraph: { title, description, url: urls.tag(tag.slug), type: "website" },
  };
}

/* Every topic with a tag, newest activity first, with a Follow button and a status filter. */
export default async function TagPage({ params, searchParams }: PageProps<"/community/tag/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const tag = await getTagBySlug(slug);
  if (!tag) notFound();

  const status = parseStatus(sp.status);
  const cursor = typeof sp.cursor === "string" ? sp.cursor : null;
  const [viewer, topicIds] = await Promise.all([getCurrentUser(), getTopicIdsForTag(tag.id)]);
  const [followed, available] = await Promise.all([
    viewer ? getFollowedTagIds(viewer.id) : Promise.resolve(null),
    viewer ? Promise.resolve(true) : tagFollowsAvailable(),
  ]);
  const canFollow = viewer ? followed !== null : available;
  const page = await getTopics({ view: "latest", cursor, topicIds, status });
  const basePath = urls.tag(tag.slug);

  return (
    <ForumShell source={basePath}>
      <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted-foreground">
        <Link href={urls.community()} className="hover:underline">
          Community
        </Link>
        {" / Tags"}
      </nav>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Tagged <span className="rounded bg-secondary px-2 py-0.5">{tag.name}</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{plural(tag.topic_count, "topic", "topics")} with this tag.</p>
        </div>
        {canFollow ? <TagFollowButton tagId={tag.id} tagName={tag.name} following={followed?.has(tag.id) ?? false} signedIn={!!viewer} /> : null}
      </div>
      <StatusFilter href={basePath} status={status} />
      <TopicList
        topics={page.topics}
        nextCursor={page.nextCursor}
        moreHref={(c) => `${basePath}?${status ? `status=${status}&` : ""}cursor=${encodeURIComponent(c)}`}
        emptyMessage={status ? "No topics with that status and this tag yet." : "No topics with this tag yet."}
      />
    </ForumShell>
  );
}
