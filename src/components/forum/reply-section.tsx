"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createReply, type ActionState } from "@/app/community/actions";
import { Composer } from "@/components/composer/composer";
import { Button } from "@/components/ui/button";
import { urls } from "@/lib/forum/urls";

type Props = {
  topicId: string;
  topicSlug: string;
  shortId: string;
  canReply: boolean;
  isLocked: boolean;
  signedIn: boolean;
  emailConfirmed: boolean;
};

export function ReplySection({ topicId, topicSlug, shortId, canReply, isLocked, signedIn, emailConfirmed }: Props) {
  const router = useRouter();
  const insertRef = useRef<((md: string) => void) | null>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await createReply(prev, formData);
      if (result.ok) {
        try {
          localStorage.removeItem(`draft:reply:${topicId}`);
        } catch {
          // ignore
        }
        toast("Reply posted.");
        router.push(result.redirectTo ?? urls.topic({ slug: topicSlug, short_id: shortId }));
        router.refresh();
      }
      return result;
    },
    { ok: false, message: "" },
  );

  /* Quote buttons on posts dispatch the quoted Markdown here. */
  useEffect(() => {
    const handler = (e: Event) => insertRef.current?.((e as CustomEvent<string>).detail);
    window.addEventListener("forum:quote", handler);
    return () => window.removeEventListener("forum:quote", handler);
  }, []);

  if (!signedIn) {
    return (
      <div id="reply" className="rounded-lg border border-dashed p-6 text-center text-sm">
        <Link href={urls.login(urls.topic({ slug: topicSlug, short_id: shortId }))} className="font-medium text-brand hover:underline">
          Sign in
        </Link>{" "}
        or{" "}
        <Link href={urls.signup()} className="font-medium text-brand hover:underline">
          join
        </Link>{" "}
        to reply.
      </div>
    );
  }

  if (isLocked && !canReply) {
    return (
      <div id="reply" className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        This topic is locked.
      </div>
    );
  }

  return (
    <form id="reply" action={action} className="space-y-3 scroll-mt-20">
      <h2 className="text-lg font-semibold">Reply</h2>
      {!emailConfirmed ? <p className="text-sm text-muted-foreground">Confirm your email address to post. Check your inbox for the link.</p> : null}
      <input type="hidden" name="topic_id" value={topicId} />
      <Composer draftKey={`reply:${topicId}`} insertRef={insertRef} placeholder="Answer with what you actually did and what happened." />
      {state.message && !state.ok ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || !emailConfirmed}>
        {pending ? "Posting" : "Post reply"}
      </Button>
    </form>
  );
}
