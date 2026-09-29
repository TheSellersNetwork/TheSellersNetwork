import Link from "next/link";
import { UserAvatar } from "@/components/forum/user-avatar";
import { CommentForm, DeleteComment } from "@/components/pickups/pickup-comment-form";
import { renderComment, type PickupComment } from "@/lib/pickups-comments";
import { displayName, longDate, plural, timeAgo } from "@/lib/format";
import { siteConfig } from "@/lib/site";

type Viewer = { id: string; isStaff: boolean; canComment: boolean } | null;

/*
  Comments under a pickup. Rendered on the server from plain text with a
  little markdown (see renderComment), so nothing a member types becomes HTML.
  Reports use the site report form with a link straight to the comment.
*/
export function PickupComments({ pickupId, comments, viewer }: { pickupId: string; comments: PickupComment[]; viewer: Viewer }) {
  const next = `/community/pickups/${pickupId}#comments`;
  return (
    <section id="comments" aria-labelledby="comments-heading" className="mt-10 max-w-2xl scroll-mt-24">
      <h2 id="comments-heading" className="text-lg font-semibold">
        {comments.length === 0 ? "Comments" : plural(comments.length, "comment")}
      </h2>
      {comments.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No comments yet. Ask where it was found, how you would list it, or what you would price it at.</p>
      ) : (
        <ol className="mt-3 divide-y rounded-xl border bg-card">
          {comments.map((c) => {
            const own = viewer?.id === c.user_id;
            const reportUrl = `/report?url=${encodeURIComponent(`${siteConfig.url}/community/pickups/${pickupId}#comment-${c.id}`)}`;
            return (
              <li key={c.id} id={`comment-${c.id}`} className="flex gap-3 p-4 scroll-mt-24">
                <UserAvatar profile={c.author} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    {c.author ? (
                      <Link href={`/community/u/${c.author.username}`} className="font-medium hover:underline">
                        {displayName(c.author)}
                      </Link>
                    ) : (
                      <span className="font-medium">Deleted member</span>
                    )}
                    <time dateTime={c.created_at} title={longDate(c.created_at)} className="text-xs text-muted-foreground">
                      {timeAgo(c.created_at)} ago
                    </time>
                  </p>
                  <div
                    className="post-body mt-1 text-sm break-words [&_a]:underline [&_a]:underline-offset-2 [&_code]:rounded [&_code]:bg-secondary [&_code]:px-1 [&_p+p]:mt-2"
                    dangerouslySetInnerHTML={{ __html: renderComment(c.body) }}
                  />
                  <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                    {own || viewer?.isStaff ? <DeleteComment id={c.id} pickupId={pickupId} /> : null}
                    {!own ? (
                      <Link href={reportUrl} className="inline-flex min-h-6 items-center underline pointer-coarse:min-h-11">
                        Report
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-4">
        {viewer?.canComment ? (
          <CommentForm pickupId={pickupId} />
        ) : viewer ? (
          <p className="text-sm text-muted-foreground">Confirm your email address and finish your profile to comment.</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-brand underline underline-offset-2 hover:text-brand-deep">
              Sign in
            </Link>{" "}
            to comment.
          </p>
        )}
      </div>
    </section>
  );
}
