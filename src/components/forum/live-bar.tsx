"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props =
  | { kind: "topics"; categoryIds?: string[] }
  | { kind: "replies"; topicId: string };

/*
  Listens for new topics (or new replies in one thread) over Supabase Realtime
  and shows a small bar inviting the reader to load them. Nothing moves under
  the reader's cursor: they choose when to refresh.
*/
export function LiveBar(props: Props) {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const categoryKey = props.kind === "topics" ? (props.categoryIds ?? []).join(",") : "";
  const topicId = props.kind === "replies" ? props.topicId : "";

  useEffect(() => {
    const supabase = createClient();
    const filter = props.kind === "replies" ? `topic_id=eq.${topicId}` : undefined;
    const table = props.kind === "replies" ? "posts" : "topics";
    const allowed = categoryKey ? new Set(categoryKey.split(",")) : null;

    const channel = supabase
      .channel(`live-${table}-${topicId || categoryKey || "all"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table, filter }, (payload) => {
        const row = payload.new as { category_id?: string; post_number?: number };
        if (props.kind === "topics" && allowed && row.category_id && !allowed.has(row.category_id)) return;
        if (props.kind === "replies" && row.post_number === 1) return;
        setCount((c) => c + 1);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [props.kind, categoryKey, topicId]);

  if (count === 0) return null;

  const label = props.kind === "topics" ? `${count} new topic${count === 1 ? "" : "s"}` : `${count} new repl${count === 1 ? "y" : "ies"}`;

  return (
    <div className="row-enter sticky top-[calc(var(--header-height)+0.5rem)] z-10 mb-3 flex justify-center">
      <button
        type="button"
        onClick={() => {
          setCount(0);
          router.refresh();
        }}
        className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-md hover:bg-brand-deep"
      >
        <ArrowUp className="size-4" />
        {label}, show
      </button>
    </div>
  );
}
