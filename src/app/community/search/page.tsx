import type { Metadata } from "next";
import { ForumShell } from "@/components/layout/forum-shell";
import { TopicList } from "@/components/forum/topic-list";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchTopics } from "@/lib/forum/queries";
import { urls } from "@/lib/forum/urls";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: PageProps<"/community/search">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const results = q ? await searchTopics(q) : [];

  return (
    <ForumShell source={urls.search()}>
      <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
      <form action={urls.search()} role="search" className="mt-4 flex gap-2">
        <label htmlFor="search-q" className="sr-only">
          Search topics and replies
        </label>
        <Input id="search-q" name="q" type="search" defaultValue={q} placeholder="Search topics and replies" autoFocus />
        <Button type="submit">Search</Button>
      </form>
      {q ? (
        <div className="mt-6">
          <p className="mb-3 text-sm text-muted-foreground">
            {results.length === 0 ? "Nothing matched." : `${results.length} result${results.length === 1 ? "" : "s"} for "${q}"`}
          </p>
          <TopicList topics={results} emptyMessage="[TOM: no search results message]" />
        </div>
      ) : null}
    </ForumShell>
  );
}
