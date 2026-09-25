"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { urls } from "@/lib/forum/urls";

type Similar = { id: string; title: string; slug: string; short_id: string; is_solved: boolean; reply_count: number };

/* Shows matching threads as a title is typed, solved ones first, to cut duplicates. */
export function SimilarTopics({ title }: { title: string }) {
  const [items, setItems] = useState<Similar[]>([]);

  useEffect(() => {
    if (title.trim().length < 8) {
      return;
    }
    const controller = new AbortController();
    const id = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/similar?q=${encodeURIComponent(title)}`, { signal: controller.signal });
        if (res.ok) setItems((await res.json()) as Similar[]);
      } catch {
        // Aborted or offline; keep what we have.
      }
    }, 400);
    return () => {
      window.clearTimeout(id);
      controller.abort();
    };
  }, [title]);

  if (title.trim().length < 8 || items.length === 0) return null;

  return (
    <aside aria-live="polite" className="rounded-lg border bg-brand-soft/50 p-3 text-sm">
      <p className="font-medium">Already asked? These look similar.</p>
      <ul className="mt-2 space-y-1">
        {items.map((t) => (
          <li key={t.id} className="flex items-center gap-2">
            {t.is_solved ? <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="Solved" /> : <span className="size-4 shrink-0" />}
            <Link href={urls.topic(t)} target="_blank" className="truncate underline underline-offset-2 hover:text-brand-deep">
              {t.title}
            </Link>
            <span className="shrink-0 text-xs text-muted-foreground">{t.reply_count} replies</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
