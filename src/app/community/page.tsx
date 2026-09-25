import type { Metadata } from "next";
import Link from "next/link";
import { ForumShell } from "@/components/layout/forum-shell";
import { TopicList } from "@/components/forum/topic-list";
import { ViewTabs } from "@/components/forum/view-tabs";
import { getCategories, getTopics, groupCategories } from "@/lib/forum/queries";
import { urls } from "@/lib/forum/urls";
import type { TopicListView, TopPeriod } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "Community",
  description: "The forum for UK resellers on eBay, Amazon, Vinted, Facebook Marketplace and beyond.",
  alternates: { canonical: "/community" },
};

function parseView(v: unknown): TopicListView {
  return v === "top" || v === "unanswered" ? v : "latest";
}
function parsePeriod(p: unknown): TopPeriod {
  return p === "day" || p === "month" || p === "all" ? p : "week";
}

export default async function CommunityPage({ searchParams }: PageProps<"/community">) {
  const params = await searchParams;
  const view = parseView(params.view);
  const period = parsePeriod(params.period);
  const cursor = typeof params.cursor === "string" ? params.cursor : null;

  const [categories, page] = await Promise.all([getCategories(), getTopics({ view, period, cursor })]);
  const groups = groupCategories(categories);

  return (
    <ForumShell source="/community">
      {!cursor ? (
        <section aria-labelledby="categories-heading" className="mb-8 lg:hidden">
          <h1 id="categories-heading" className="mb-3 text-xl font-semibold tracking-tight">
            Categories
          </h1>
          <ul className="grid gap-2 sm:grid-cols-2">
            {groups.map((g) => (
              <li key={g.id} className="rounded-lg border bg-card p-3">
                <Link href={urls.category(g.slug)} className="flex items-center gap-2 font-medium hover:underline">
                  <span className="h-4 w-1 rounded-full" style={{ background: `var(--cat-${g.colour})` }} aria-hidden="true" />
                  {g.name}
                </Link>
                {g.children.length > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {g.children.map((c, i) => (
                      <span key={c.id}>
                        {i > 0 ? ", " : ""}
                        <Link href={urls.category(c.slug)} className="hover:underline">
                          {c.name}
                        </Link>
                      </span>
                    ))}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="topics-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h1 id="topics-heading" className="text-xl font-semibold tracking-tight">
            {view === "top" ? "Top topics" : view === "unanswered" ? "Unanswered topics" : "Latest topics"}
          </h1>
        </div>
        <ViewTabs basePath={urls.community()} view={view} period={period} />
        <TopicList
          topics={page.topics}
          nextCursor={page.nextCursor}
          moreHref={(c) => `${urls.community()}?view=${view}&period=${period}&cursor=${encodeURIComponent(c)}`}
          emptyMessage={view === "unanswered" ? "Every topic has a reply. [TOM: unanswered empty state]" : "[TOM: empty community message]"}
        />
      </section>
    </ForumShell>
  );
}
