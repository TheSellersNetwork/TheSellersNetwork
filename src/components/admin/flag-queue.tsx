"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveFlag } from "@/app/admin/flags/actions";
import { displayName, timeAgo } from "@/lib/format";
import { excerpt } from "@/lib/markdown/render";
import { urls } from "@/lib/forum/urls";

export type QueueFlag = {
  id: string;
  reason: string;
  note: string | null;
  created_at: string;
  reporter: { username: string; display_name: string | null; trust_level: number } | null;
  post: {
    id: string;
    body_md: string;
    is_hidden: boolean;
    post_number: number;
    author: { username: string; display_name: string | null } | null;
    topic: { id: string; title: string; slug: string; short_id: string } | null;
  } | null;
};

const reasonLabels: Record<string, string> = {
  spam: "Spam",
  selling: "Selling",
  off_topic: "Off topic",
  abuse: "Abuse",
  policy_evasion: "Policy evasion",
  other: "Other",
};

export function FlagQueue({ flags }: { flags: QueueFlag[] }) {
  if (flags.length === 0) {
    return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">The queue is empty.</p>;
  }
  return (
    <ul className="space-y-4">
      {flags.map((flag) => (
        <FlagCard key={flag.id} flag={flag} />
      ))}
    </ul>
  );
}

function FlagCard({ flag }: { flag: QueueFlag }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");

  function act(decision: "agreed" | "disagreed" | "ignored") {
    start(async () => {
      const result = await resolveFlag(flag.id, decision, reason);
      if (result.ok) {
        toast(result.message);
        router.refresh();
      } else toast.error(result.message);
    });
  }

  return (
    <li className="rounded-lg border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">{reasonLabels[flag.reason] ?? flag.reason}</span>
        <span>
          Flagged by {flag.reporter ? `${displayName(flag.reporter)} (TL${flag.reporter.trust_level})` : "a deleted member"} {timeAgo(flag.created_at)} ago
        </span>
        {flag.post?.is_hidden ? <span className="text-destructive">Post is hidden</span> : null}
      </div>
      {flag.note ? <p className="mt-2 italic">Reporter note: {flag.note}</p> : null}
      {flag.post ? (
        <div className="mt-3 rounded-md border bg-background p-3">
          <p className="text-xs text-muted-foreground">
            {flag.post.author ? displayName(flag.post.author) : "Deleted member"} in{" "}
            {flag.post.topic ? (
              <Link href={urls.topic(flag.post.topic, flag.post.post_number)} className="text-brand underline underline-offset-2 hover:text-brand-deep">
                {flag.post.topic.title}
              </Link>
            ) : (
              "a removed topic"
            )}
          </p>
          <p className="mt-1 whitespace-pre-line">{excerpt(flag.post.body_md, 600)}</p>
        </div>
      ) : (
        <p className="mt-3 text-muted-foreground">The post no longer exists.</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason the author will see (for agree)" className="max-w-sm" maxLength={500} />
        <Button size="sm" onClick={() => act("agreed")} disabled={pending}>
          Agree, hide and warn
        </Button>
        <Button size="sm" variant="outline" onClick={() => act("disagreed")} disabled={pending}>
          Disagree, restore
        </Button>
        <Button size="sm" variant="ghost" onClick={() => act("ignored")} disabled={pending}>
          Ignore
        </Button>
      </div>
    </li>
  );
}
