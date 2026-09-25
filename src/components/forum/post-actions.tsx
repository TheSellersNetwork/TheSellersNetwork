"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Flag, Heart, Link2, Pencil, Quote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Composer } from "@/components/composer/composer";
import { deletePost, editPost, flagPost, markSolved, toggleLike, type ActionState } from "@/app/community/actions";
import { track } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

type Props = {
  postId: string;
  postNumber: number;
  topicId: string;
  topicUrl: string;
  authorUsername: string | null;
  bodyMd: string;
  likeCount: number;
  likedByMe: boolean;
  signedIn: boolean;
  canFlag: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canMarkSolution: boolean;
  isSolution: boolean;
};

const reasons: { value: string; label: string }[] = [
  { value: "selling", label: "Selling or linking to listings" },
  { value: "spam", label: "Spam" },
  { value: "off_topic", label: "Off topic" },
  { value: "abuse", label: "Abusive" },
  { value: "policy_evasion", label: "Advice on evading policy or the law" },
  { value: "other", label: "Something else" },
];

export function PostActions(props: Props) {
  const router = useRouter();
  const [liked, setLiked] = useState(props.likedByMe);
  const [count, setCount] = useState(props.likeCount);
  const [pending, start] = useTransition();
  const [flagOpen, setFlagOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  function like() {
    if (!props.signedIn) {
      toast("Sign in to like posts.");
      return;
    }
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    start(async () => {
      const result = await toggleLike(props.postId);
      if (!result.ok) {
        setLiked(!next);
        setCount((c) => c - (next ? 1 : -1));
        toast.error(result.message);
      } else if (typeof result.count === "number") {
        setCount(result.count);
      }
    });
  }

  function quote() {
    const lines = props.bodyMd.split("\n").slice(0, 12).join("\n");
    const md = `> @${props.authorUsername ?? "member"} wrote:\n${lines
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n")}`;
    window.dispatchEvent(new CustomEvent("forum:quote", { detail: md }));
    document.getElementById("reply")?.scrollIntoView({ behavior: "smooth" });
  }

  async function copyLink() {
    const url = `${window.location.origin}${props.topicUrl}${props.postNumber > 1 ? `#post-${props.postNumber}` : ""}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied.");
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  function solution() {
    start(async () => {
      const result = await markSolved(props.topicId, props.isSolution ? null : props.postId);
      if (result.ok) {
        if (!props.isSolution) track("solution_marked", { topic_id: props.topicId });
        toast(result.message);
        router.refresh();
      } else toast.error(result.message);
    });
  }

  function remove() {
    if (!window.confirm("Delete this post? This cannot be undone by you.")) return;
    start(async () => {
      const result = await deletePost(props.postId);
      if (result.ok) {
        toast(result.message);
        router.refresh();
      } else toast.error(result.message);
    });
  }

  return (
    <footer className="flex flex-wrap items-center gap-1 border-t px-2 py-1.5">
      <Button type="button" variant="ghost" size="sm" onClick={like} aria-pressed={liked} aria-label={liked ? "Unlike" : "Like"} disabled={pending}>
        <Heart className={cn("size-4", liked && "fill-current text-destructive")} />
        <span className="tabular-nums">{count}</span>
      </Button>
      {props.signedIn ? (
        <Button type="button" variant="ghost" size="sm" onClick={quote}>
          <Quote className="size-4" /> Quote
        </Button>
      ) : null}
      <Button type="button" variant="ghost" size="sm" onClick={copyLink}>
        <Link2 className="size-4" /> Share
      </Button>
      {props.canMarkSolution ? (
        <Button type="button" variant="ghost" size="sm" onClick={solution} disabled={pending} className={cn(props.isSolution && "text-success")}>
          <CheckCircle2 className="size-4" /> {props.isSolution ? "Unmark solution" : "Mark as solution"}
        </Button>
      ) : null}
      <span className="flex-1" />
      {props.canEdit ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" /> Edit
        </Button>
      ) : null}
      {props.canDelete ? (
        <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={pending}>
          <Trash2 className="size-4" /> Delete
        </Button>
      ) : null}
      {props.canFlag ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => setFlagOpen(true)}>
          <Flag className="size-4" /> Flag
        </Button>
      ) : null}

      <FlagDialog open={flagOpen} onOpenChange={setFlagOpen} postId={props.postId} />
      <EditDialog open={editOpen} onOpenChange={setEditOpen} postId={props.postId} bodyMd={props.bodyMd} />
    </footer>
  );
}

function FlagDialog({ open, onOpenChange, postId }: { open: boolean; onOpenChange: (o: boolean) => void; postId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await flagPost(prev, formData);
      if (result.ok) {
        toast(result.message);
        onOpenChange(false);
      }
      return result;
    },
    { ok: false, message: "" },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form action={action}>
          <DialogHeader>
            <DialogTitle>Flag this post</DialogTitle>
            <DialogDescription>Staff review every flag. Flags are private.</DialogDescription>
          </DialogHeader>
          <input type="hidden" name="post_id" value={postId} />
          <fieldset className="my-4 space-y-2">
            <legend className="sr-only">Reason</legend>
            {reasons.map((r, i) => (
              <label key={r.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name="reason" value={r.value} defaultChecked={i === 0} className="accent-brand" />
                {r.label}
              </label>
            ))}
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor={`flag-note-${postId}`}>Anything staff should know (optional)</Label>
            <Textarea id={`flag-note-${postId}`} name="note" maxLength={1000} rows={3} />
          </div>
          {!state.ok && state.message ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {state.message}
            </p>
          ) : null}
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending" : "Send flag"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ open, onOpenChange, postId, bodyMd }: { open: boolean; onOpenChange: (o: boolean) => void; postId: string; bodyMd: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await editPost(prev, formData);
      if (result.ok) {
        toast(result.message);
        onOpenChange(false);
        router.refresh();
      }
      return result;
    },
    { ok: false, message: "" },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form action={action}>
          <DialogHeader>
            <DialogTitle>Edit post</DialogTitle>
            <DialogDescription>Edits after five minutes are marked as edited.</DialogDescription>
          </DialogHeader>
          <input type="hidden" name="post_id" value={postId} />
          <div className="my-4">{open ? <Composer initialMarkdown={bodyMd} minHeight={200} autoFocus /> : null}</div>
          {!state.ok && state.message ? (
            <p className="text-sm text-destructive" role="alert">
              {state.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
