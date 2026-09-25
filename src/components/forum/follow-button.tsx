"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setCategoryFollow } from "@/app/community/follow-actions";

type Level = "following" | "muted" | null;

export function FollowButton({ categoryId, level, signedIn }: { categoryId: string; level: Level; signedIn: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function set(next: Level) {
    if (!signedIn) {
      toast("Sign in to follow categories.");
      return;
    }
    start(async () => {
      const r = await setCategoryFollow(categoryId, next);
      if (r.ok) router.refresh();
      else toast.error(r.message);
    });
  }

  return (
    <div className="flex gap-1">
      <Button size="sm" variant={level === "following" ? "default" : "outline"} disabled={pending} onClick={() => set(level === "following" ? null : "following")} aria-pressed={level === "following"}>
        {level === "following" ? <Check /> : <Bell />}
        {level === "following" ? "Following" : "Follow"}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => set(level === "muted" ? null : "muted")} aria-pressed={level === "muted"} aria-label={level === "muted" ? "Unmute category" : "Mute category"}>
        <BellOff />
        {level === "muted" ? "Muted" : "Mute"}
      </Button>
    </div>
  );
}
