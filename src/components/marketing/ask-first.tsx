"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { urls } from "@/lib/forum/urls";

type Cat = { id: string; slug: string; name: string; parent_id: string | null };

/*
  Ask before you join. A visitor types the question here; it is saved in the
  browser, they sign up and verify, and the composer opens with everything
  filled in so posting is one click. Signed-in members get sent straight to
  the composer with the same prefill.
*/
export function AskFirst({ categories, signedIn }: { categories: Cat[]; signedIn: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const groups = categories.filter((c) => !c.parent_id).map((p) => ({ parent: p, children: categories.filter((c) => c.parent_id === p.id) }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      localStorage.setItem("draft:new-topic", body.trim());
      localStorage.setItem("tsn:pending-title", title.trim());
    } catch {
      // Storage unavailable: the composer will just start empty.
    }
    const next = urls.newTopic(category || undefined);
    router.push(signedIn ? next : `${urls.signup()}?next=${encodeURIComponent(next)}`);
  }

  return (
    <form onSubmit={submit} className="forum-card row-enter rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">Got a question? Ask it now</h2>
      <p className="mt-1 text-sm text-muted-foreground">Write it here first. You create your account after, and it posts as soon as you have verified your email.</p>
      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="ask-title">Your question in one line</Label>
          <Input id="ask-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={8} maxLength={200} placeholder="For example: Tracked 24 or Tracked 48 for a 1.5kg parcel?" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ask-body">The detail</Label>
          <Textarea id="ask-body" value={body} onChange={(e) => setBody(e.target.value)} required minLength={20} rows={3} placeholder="What you tried, what happened, and the numbers if you have them." />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="ask-category">Where does it belong?</Label>
            <select id="ask-category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
              <option value="">Not sure, pick later</option>
              {groups.map(({ parent, children }) => (
                <optgroup key={parent.id} label={parent.name}>
                  {(children.length ? children : [parent]).map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <Button type="submit" className="self-end">
            {signedIn ? "Continue to post" : "Continue, then join free"}
          </Button>
        </div>
      </div>
    </form>
  );
}
