"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { addPickupComment, deletePickupComment, type CommentState } from "@/app/community/pickups/actions";
import { COMMENT_MAX } from "@/lib/pickups-comments";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CommentForm({ pickupId }: { pickupId: string }) {
  const [state, action, pending] = useActionState<CommentState, FormData>(addPickupComment, { ok: false, message: "" });
  const form = useRef<HTMLFormElement>(null);

  // Clear the box after each successful post.
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state.ok, state.nonce]);

  return (
    <form ref={form} action={action} className="space-y-2">
      <input type="hidden" name="pickup_id" value={pickupId} />
      <Label htmlFor="comment-body">Add a comment</Label>
      <Textarea id="comment-body" name="body" required maxLength={COMMENT_MAX} rows={3} placeholder="Be kind and specific. **bold** and *italic* work." />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Posting" : "Post comment"}
        </Button>
        <p aria-live="polite" className={state.ok ? "text-sm text-success" : "text-sm text-destructive"}>
          {state.message}
        </p>
      </div>
    </form>
  );
}

export function DeleteComment({ id, pickupId }: { id: string; pickupId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="inline-flex min-h-6 items-center underline hover:text-destructive disabled:opacity-60 pointer-coarse:min-h-11"
      onClick={() => {
        if (!window.confirm("Delete this comment?")) return;
        start(async () => {
          const r = await deletePickupComment(id, pickupId);
          if (!r.ok) toast(r.message ?? "That did not work.");
        });
      }}
    >
      {pending ? "Deleting" : "Delete"}
    </button>
  );
}
