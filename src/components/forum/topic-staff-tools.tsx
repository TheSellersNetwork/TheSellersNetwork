"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setTopicFlags } from "@/app/community/actions";

export function TopicStaffTools({ topicId, isPinned, isLocked }: { topicId: string; isPinned: boolean; isLocked: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(patch: { is_pinned?: boolean; is_locked?: boolean }) {
    start(async () => {
      const result = await setTopicFlags(topicId, patch);
      if (result.ok) router.refresh();
      else toast.error(result.message);
    });
  }

  return (
    <span className="ml-auto flex gap-1">
      <Button type="button" size="xs" variant="outline" disabled={pending} onClick={() => run({ is_pinned: !isPinned })}>
        {isPinned ? "Unpin" : "Pin"}
      </Button>
      <Button type="button" size="xs" variant="outline" disabled={pending} onClick={() => run({ is_locked: !isLocked })}>
        {isLocked ? "Unlock" : "Lock"}
      </Button>
    </span>
  );
}
