"use client";

import Link from "next/link";
import { useState } from "react";
import { NewTopicForm } from "@/components/forum/new-topic-form";
import { UserAvatar } from "@/components/forum/user-avatar";
import { urls } from "@/lib/forum/urls";

type Cat = { id: string; slug: string; name: string; parent_id: string | null; min_trust_to_post: number };
type Viewer = { username: string; display_name: string | null; avatar_url: string | null; trust_level: number } | null;

/*
  A chat-style "Ask the community" box at the top of the front page. Click it
  and the full composer opens in place, so asking feels as quick as typing a
  message without losing the structure of a proper topic.
*/
export function QuickAsk({ viewer, categories }: { viewer: Viewer; categories: Cat[] }) {
  const [open, setOpen] = useState(false);

  if (!viewer) {
    return (
      <div className="forum-card flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm">
        <span className="flex-1 text-muted-foreground">Got a question about selling? Ask the community.</span>
        <Link href={urls.signup()} className="font-medium text-brand underline underline-offset-2 hover:text-brand-deep">
          Join free
        </Link>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="forum-card flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left text-sm transition-colors hover:border-brand/60"
      >
        <UserAvatar profile={viewer} size="sm" link={false} />
        <span className="flex-1 text-muted-foreground">Ask the community anything about selling</span>
        <span className="rounded-md bg-brand px-3 py-1 text-xs font-medium text-primary-foreground">New topic</span>
      </button>
    );
  }

  return (
    <div className="forum-card row-enter rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Ask the community</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:underline">
          Close
        </button>
      </div>
      <NewTopicForm categories={categories} preselectedSlug={null} trustLevel={viewer.trust_level} />
    </div>
  );
}
