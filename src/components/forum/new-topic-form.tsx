"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createTopic, type ActionState } from "@/app/community/actions";
import { Composer } from "@/components/composer/composer";
import { SimilarTopics } from "@/components/forum/similar-topics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

type Cat = { id: string; slug: string; name: string; parent_id: string | null; min_trust_to_post: number; layout?: string };

export function NewTopicForm({ categories, preselectedSlug, trustLevel }: { categories: Cat[]; preselectedSlug: string | null; trustLevel: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createTopic, { ok: false, message: "" });
  const initial = categories.find((c) => c.slug === preselectedSlug)?.id ?? "";
  const [categoryId, setCategoryId] = useState(initial);
  const [title, setTitle] = useState("");

  /* A question written on the landing page before signing up arrives here. */
  useEffect(() => {
    try {
      const pending = localStorage.getItem("tsn:pending-title");
      if (pending) {
        localStorage.removeItem("tsn:pending-title");
        // Deferred so the restore does not run inside the effect body.
        queueMicrotask(() => setTitle(pending));
      }
    } catch {
      // Storage unavailable.
    }
  }, []);

  const groups = useMemo(() => {
    const parents = categories.filter((c) => !c.parent_id);
    return parents.map((p) => ({ parent: p, children: categories.filter((c) => c.parent_id === p.id) }));
  }, [categories]);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required minLength={3} maxLength={200} placeholder="Say what it is about in one line" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
        <SimilarTopics title={title} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <input type="hidden" name="category_id" value={categoryId} />
        <Select value={categoryId} onValueChange={setCategoryId} required>
          <SelectTrigger id="category" className="w-full sm:w-80">
            <SelectValue placeholder="Pick a category" />
          </SelectTrigger>
          <SelectContent>
            {groups.map(({ parent, children }) => (
              <SelectGroup key={parent.id}>
                <SelectLabel>{parent.name}</SelectLabel>
                {children.length === 0 ? (
                  <SelectItem value={parent.id} disabled={trustLevel < parent.min_trust_to_post}>
                    {parent.name}
                  </SelectItem>
                ) : (
                  children.map((c) => (
                    <SelectItem key={c.id} value={c.id} disabled={trustLevel < c.min_trust_to_post}>
                      {c.name}
                    </SelectItem>
                  ))
                )}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {categories.find((c) => c.id === categoryId)?.layout === "deals" ? (
        <div className="space-y-1.5">
          <Label htmlFor="expires_at">When does the deal end? (optional)</Label>
          <Input id="expires_at" name="expires_at" type="date" className="w-48" />
          <p className="text-xs text-muted-foreground">Members can also vote &ldquo;still valid&rdquo; or &ldquo;expired&rdquo;.</p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label>Post</Label>
        <Composer draftKey="new-topic" minHeight={260} />
      </div>

      {state.message ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || !categoryId}>
          {pending ? "Posting" : "Post topic"}
        </Button>
        <span className="text-xs text-muted-foreground">Drafts are saved in this browser as you type.</span>
      </div>
    </form>
  );
}
