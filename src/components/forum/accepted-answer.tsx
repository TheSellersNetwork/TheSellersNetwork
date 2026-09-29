import { CheckCircle2, VenetianMask } from "lucide-react";
import { UserAvatar } from "@/components/forum/user-avatar";
import { ProfileName } from "@/components/forum/profile-name";
import { JumpToPost } from "@/components/forum/jump-to-post";
import { plainExcerpt } from "@/lib/forum/previews";
import type { PostRow } from "@/lib/db/types";

/*
  Shown under the opening post of a solved topic: who solved it, the start of
  the answer and a link down to the full post in the thread.
*/
export function AcceptedAnswer({ post, children }: { post: PostRow; children?: React.ReactNode }) {
  const anonymous = post.is_anonymous;
  const text = plainExcerpt(post.body_md, 280);
  return (
    <section aria-labelledby="accepted-answer-heading" id="solution" data-testid="accepted-answer" className="scroll-mt-20 rounded-lg border-2 border-success/60 bg-card">
      <div className="space-y-3 p-4">
        <h2 id="accepted-answer-heading" className="flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 className="size-4" aria-hidden="true" /> Accepted answer
        </h2>
        <div className="flex items-center gap-2 text-sm">
          {anonymous ? (
            <>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground" aria-hidden="true">
                <VenetianMask className="size-4" />
              </span>
              <span className="font-medium">Anonymous member</span>
            </>
          ) : post.author ? (
            <>
              <UserAvatar profile={post.author} size="sm" />
              <ProfileName profile={post.author} className="font-medium hover:underline" />
            </>
          ) : (
            <span className="font-medium">Deleted member</span>
          )}
        </div>
        {text ? <p className="line-clamp-3 text-sm text-muted-foreground">{text}</p> : null}
        <JumpToPost postNumber={post.post_number} />
      </div>
      {children ? <div className="border-t p-4">{children}</div> : null}
    </section>
  );
}
