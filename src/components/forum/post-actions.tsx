"use client";

import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";
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
import { postArticleFor, quoteMarkdownFor, selectedTextIn, sendQuote } from "@/components/forum/quote-client";

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
  likeLabel?: string;
};

const reasons: { value: string; label: string }[] = [
  { value: "selling", label: "Selling or linking to listings" },
  { value: "spam", label: "Spam" },
  { value: "scam", label: "A scam or fraud" },
  { value: "off_topic", label: "Off topic" },
  { value: "abuse", label: "Abusive" },
  { value: "harassment", label: "Harassment or threats" },
  { value: "illegal", label: "Illegal content" },
  { value: "child_safety", label: "Puts a child at risk" },
  { value: "defamation", label: "Untrue and damaging about a person or business" },
  { value: "copyright", label: "Uses someone else's copyright work" },
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
  const footerRef = useRef<HTMLElement>(null);
  const selectionRef = useRef<string | null>(null);

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

  /* Quotes the text selected in this post, or the whole post when nothing is selected. */
  function rememberSelection() {
    selectionRef.current = selectedTextIn(postArticleFor(footerRef.current));
  }
  function quote() {
    const article = postArticleFor(footerRef.current);
    const text = selectionRef.current ?? selectedTextIn(article) ?? props.bodyMd;
    selectionRef.current = null;
    if (article) sendQuote(quoteMarkdownFor(article, text));
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
    <footer ref={footerRef} className="flex flex-wrap items-center gap-1 border-t px-2 py-1.5">
      <Button type="button" variant="ghost" size="sm" onClick={like} aria-pressed={liked} aria-label={liked ? "Unlike" : "Like"} disabled={pending}>
        <Heart className={cn("size-4", liked && "fill-current text-destructive")} />
        {props.likeLabel ? <span>{props.likeLabel}</span> : null}
        <span className="tabular-nums">{count}</span>
      </Button>
      {props.signedIn ? (
        <Button type="button" variant="ghost" size="sm" onPointerDown={rememberSelection} onClick={quote} title="Quote the selected text, or the whole post">
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
          <Flag className="size-4" /> Report
        </Button>
      ) : null}

      <FlagDialog open={flagOpen} onOpenChange={setFlagOpen} postId={props.postId} postPath={`${props.topicUrl}${props.postNumber > 1 ? `#post-${props.postNumber}` : ""}`} />
      <EditDialog open={editOpen} onOpenChange={setEditOpen} postId={props.postId} bodyMd={props.bodyMd} />
    </footer>
  );
}

function FlagDialog({ open, onOpenChange, postId, postPath }: { open: boolean; onOpenChange: (o: boolean) => void; postId: string; postPath: string }) {
  const [reason, setReason] = useState(reasons[0].value);
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
            <DialogTitle>Report this post</DialogTitle>
            <DialogDescription>
              Staff review every report and nobody else sees who sent it. If it is about you and needs a reply, such as a defamation or copyright complaint, use the{" "}
              <Link href="/report" className="underline">
                report form
              </Link>{" "}
              instead.
            </DialogDescription>
          </DialogHeader>
          <input type="hidden" name="post_id" value={postId} />
          <fieldset className="my-4 space-y-2">
            <legend className="sr-only">Reason</legend>
            {reasons.map((r) => (
              <label key={r.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-brand" />
                {r.label}
              </label>
            ))}
          </fieldset>
          {reason === "defamation" ? (
            <div className="mb-4 rounded-lg border bg-muted/40 p-3 text-sm" role="note">
              <p>
                A flag lets staff review the post under the house rules. If the post is about you, it is not a legal complaint. For that, use the{" "}
                <Link href={`/report?kind=defamation&url=${encodeURIComponent(`${typeof window === "undefined" ? "" : window.location.origin}${postPath}`)}`} className="underline">
                  defamation complaint form
                </Link>
                , which asks for what the law needs so we can pass it to the person who posted it.
              </p>
            </div>
          ) : null}
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
