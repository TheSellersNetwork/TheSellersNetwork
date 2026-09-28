import Link from "next/link";
import { VenetianMask } from "lucide-react";
import { UserAvatar } from "@/components/forum/user-avatar";
import { PostActions } from "@/components/forum/post-actions";
import { FlairChips, StreakChip } from "@/components/forum/flair-chips";
import { getStreak } from "@/lib/forum/extras-queries";
import { displayName, longDate, timeAgo, trustLabel } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown/render";
import { urls } from "@/lib/forum/urls";
import type { CurrentUser } from "@/lib/auth";
import type { PostRow, TopicRow } from "@/lib/db/types";
import { cn } from "@/lib/utils";

type Props = {
  post: PostRow;
  topic: TopicRow;
  viewer: CurrentUser | null;
  canMarkSolution: boolean;
  isSolution: boolean;
  isOpening?: boolean;
  framed?: boolean;
  /* Label for the like button, e.g. Kudos in weekly threads. */
  likeLabel?: string;
  /* For anonymous posts: the real author, present only for staff and for the author themselves. */
  anonymousAuthor?: { user_id: string; username: string } | null;
};

const FIVE_MINUTES = 5 * 60 * 1000;

export async function PostItem({ post, topic, viewer, canMarkSolution, isSolution, isOpening, framed = true, likeLabel, anonymousAuthor }: Props) {
  const anonymous = post.is_anonymous;
  const streak = post.author && !anonymous ? await getStreak(post.author.id) : 0;
  const anchor = `post-${post.post_number}`;
  const showEdited = post.edited_at && new Date(post.edited_at).getTime() - new Date(post.created_at).getTime() > FIVE_MINUTES;
  const isAuthor = !!viewer && (anonymous ? anonymousAuthor?.user_id === viewer.id : viewer.id === post.author_id);
  // Anonymous posts are written by the server, so only staff can edit them.
  const canEdit = !!viewer && !post.is_deleted && (isAuthor && !anonymous ? viewer.profile.trust_level >= 1 || viewer.profile.is_staff : viewer.profile.is_staff);
  // body_html is cached at write time; render on the fly only if a row predates the cache.
  const html = post.body_html ?? (await renderMarkdown(post.body_md));

  if (post.is_deleted) {
    return (
      <article id={anchor} className={cn("rounded-lg border border-dashed p-4 text-sm text-muted-foreground", !framed && "border-0")}>
        This post was deleted.
      </article>
    );
  }

  return (
    <article id={anchor} className={cn("scroll-mt-20", framed && "forum-card rounded-lg border bg-card", post.is_hidden && "opacity-70")}>
      <header className="flex items-center gap-3 px-4 pt-4">
        {anonymous ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground" aria-hidden="true">
            <VenetianMask className="size-5" />
          </span>
        ) : (
          <UserAvatar profile={post.author} size="md" />
        )}
        <div className="min-w-0 flex-1 text-sm">
          <div className="flex flex-wrap items-center gap-x-2">
            {anonymous ? (
              <>
                <span className="font-semibold">Anonymous member</span>
                <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">Posted anonymously</span>
                {isAuthor ? <span className="text-xs text-muted-foreground">You posted this. Only you and staff can see that.</span> : null}
                {!isAuthor && anonymousAuthor ? (
                  <Link href={urls.profile(anonymousAuthor.username)} className="text-xs text-muted-foreground underline">
                    @{anonymousAuthor.username} (staff only)
                  </Link>
                ) : null}
              </>
            ) : post.author ? (
              <Link href={urls.profile(post.author.username)} className="font-semibold hover:underline">
                {displayName(post.author)}
              </Link>
            ) : (
              <span className="font-semibold">Deleted member</span>
            )}
            {post.author && !anonymous ? <span className="text-muted-foreground">@{post.author.username}</span> : null}
            {post.author && !anonymous ? (
              <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">{trustLabel(post.author.trust_level, post.author.is_staff)}</span>
            ) : null}
            {post.author && !anonymous && post.author.solution_count > 0 ? (
              <span className="text-xs text-success" title="Accepted answers">
                {post.author.solution_count} {post.author.solution_count === 1 ? "solution" : "solutions"}
              </span>
            ) : null}
            {isOpening && !anonymous && post.author?.id === topic.author_id ? <span className="text-xs text-muted-foreground">Original poster</span> : null}
            <StreakChip weeks={streak} />
          </div>
          {anonymous ? null : <FlairChips flair={post.author?.flair} className="mt-0.5 block" />}
          <div className="text-xs text-muted-foreground">
            <a href={`#${anchor}`} className="hover:underline">
              <time dateTime={post.created_at} title={longDate(post.created_at)}>
                {timeAgo(post.created_at)} ago
              </time>
            </a>
            {showEdited && post.edited_at ? (
              <>
                {" "}
                <span title={longDate(post.edited_at)}>(edited {timeAgo(post.edited_at)} ago)</span>
              </>
            ) : null}
            {post.is_hidden ? <span className="ml-2 text-destructive">Hidden pending review</span> : null}
          </div>
        </div>
        <span className="text-xs text-muted-foreground">#{post.post_number}</span>
      </header>
      <div data-glossary className="post-body prose prose-neutral max-w-none px-4 py-3 dark:prose-invert prose-a:text-brand prose-img:rounded-md" dangerouslySetInnerHTML={{ __html: html }} />
      <PostActions
        postId={post.id}
        postNumber={post.post_number}
        topicId={topic.id}
        topicUrl={urls.topic(topic)}
        authorUsername={anonymous ? null : (post.author?.username ?? null)}
        bodyMd={post.body_md}
        likeCount={post.like_count}
        likedByMe={post.liked_by_me ?? false}
        signedIn={!!viewer}
        canFlag={!!viewer && (viewer.profile.trust_level >= 1 || viewer.profile.is_staff) && !isAuthor}
        canEdit={canEdit}
        canDelete={!!viewer && (isAuthor || viewer.profile.is_staff)}
        canMarkSolution={canMarkSolution && !isOpening}
        isSolution={isSolution}
        likeLabel={likeLabel}
      />
    </article>
  );
}
