"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setTagFollow } from "@/app/community/tag-actions";
import { cn } from "@/lib/utils";

type Props = {
  tagId: string;
  tagName: string;
  following: boolean;
  signedIn: boolean;
  /* Small pill for the topic sidebar, a full button on the tag page. */
  compact?: boolean;
  className?: string;
};

/* Follow a tag. New topics with it reach the bell and, for members who opt in, the weekly digest. */
export function TagFollowButton({ tagId, tagName, following, signedIn, compact, className }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(following);

  function toggle() {
    if (!signedIn) {
      toast("Sign in to follow tags.");
      return;
    }
    start(async () => {
      setShown(!shown);
      const r = await setTagFollow(tagId, !shown);
      if (!r.ok) toast.error(r.message);
      else toast(r.message);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={shown ? "default" : "outline"}
      disabled={pending}
      onClick={toggle}
      aria-pressed={shown}
      aria-label={compact ? `${shown ? "Unfollow" : "Follow"} the ${tagName} tag` : undefined}
      className={cn(compact && "h-8 min-h-8 px-2 text-xs max-sm:min-h-11", className)}
      data-testid="tag-follow"
    >
      {shown ? <Check /> : <Plus />}
      {shown ? "Following" : "Follow"}
    </Button>
  );
}
