import type { Metadata } from "next";
import Link from "next/link";
import { ForumShell } from "@/components/layout/forum-shell";
import { TopicList } from "@/components/forum/topic-list";
import { ViewTabs } from "@/components/forum/view-tabs";
import { after } from "next/server";
import { getCategories, getCategoryFollows, getTopics, groupCategories } from "@/lib/forum/queries";
import { getOnlineMembers } from "@/lib/forum/live-queries";
import { getCurrentUser } from "@/lib/auth";
import { CommunityStats } from "@/components/forum/community-stats";
import { HeroCards } from "@/components/forum/hero-cards";
import { QuickAsk } from "@/components/forum/quick-ask";
import { LiveBar } from "@/components/forum/live-bar";
import { recordHomeVisit } from "@/app/community/presence-actions";
import { ExploreForums } from "@/components/forum/explore-forums";
import { ActivityTabs } from "@/components/forum/activity-tabs";
import { PromoCard } from "@/components/marketing/promo-card";
import { getRecentReplies, getRecentTopics } from "@/lib/forum/overview-queries";
import { urls } from "@/lib/forum/urls";
import type { TopicListView, TopPeriod } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "Community",
  description: "The forum for UK resellers on eBay, Amazon, Vinted, Facebook Marketplace and beyond.",
  alternates: { canonical: "/community" },
};

function parseView(v: unknown): TopicListView | null {
  return v === "top" || v === "unanswered" || v === "following" || v === "latest" ? v : null;
}
function parsePeriod(p: unknown): TopPeriod {
  return p === "day" || p === "month" || p === "all" ? p : "week";
}

export default async function CommunityPage({ searchParams }: PageProps<"/community">) {
  const params = await searchParams;
  const requested = parseView(params.view);
  const period = parsePeriod(params.period);
  const cursor = typeof params.cursor === "string" ? params.cursor : null;

  const [categories, user] = await Promise.all([getCategories(), getCurrentUser()]);
  const groups = groupCategories(categories);
  const follows = user ? await getCategoryFollows(user.id) : new Map<string, "following" | "muted">();

  // Followed categories include their subcategories; muted ones drop out of every feed.
  const withChildren = (ids: string[]) =>
    categories.filter((c) => ids.includes(c.id) || (c.parent_id !== null && ids.includes(c.parent_id))).map((c) => c.id);
  const followedIds = withChildren(Array.from(follows.entries()).filter(([, l]) => l === "following").map(([id]) => id));
  const mutedIds = new Set(withChildren(Array.from(follows.entries()).filter(([, l]) => l === "muted").map(([id]) => id)));

  // No view means the Explore overview. A view means a topic list.
  const explore = requested === null;
  const view: TopicListView = requested ?? "latest";
  const categoryIds =
    view === "following" ? followedIds : mutedIds.size > 0 ? categories.map((c) => c.id).filter((id) => !mutedIds.has(id)) : undefined;

  const [page, online, replies, recentTopics] = await Promise.all([
    explore ? Promise.resolve({ topics: [], nextCursor: null }) : getTopics({ view: view === "following" ? "latest" : view, period, cursor, categoryIds }),
    getOnlineMembers(50),
    explore ? getRecentReplies(8) : Promise.resolve([]),
    explore ? getRecentTopics(8) : Promise.resolve([]),
  ]);
  const onlineIds = new Set(online.map((m) => m.id));
  const newSince = user?.profile.home_visited_at ?? null;
  if (user) after(() => recordHomeVisit(user.id));

  return (
    <ForumShell
      source="/community"
      activeNav={explore ? "all" : view}
      rail={explore ? (
        <>
          <PromoCard />
          <ActivityTabs replies={replies} topics={recentTopics} onlineIds={online.map((m) => m.id)} />
        </>
      ) : undefined}
    >
      {explore ? (
        <div className="space-y-6">
          <QuickAsk
            viewer={user ? { username: user.profile.username, display_name: user.profile.display_name, avatar_url: user.profile.avatar_url, trust_level: user.profile.trust_level } : null}
            categories={categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name, parent_id: c.parent_id, min_trust_to_post: c.min_trust_to_post, layout: c.layout }))}
          />
          <CommunityStats />
          <HeroCards />
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight">Explore forums</h1>
            <Link href={`${urls.community()}?view=latest`} className="text-sm text-brand underline underline-offset-2 hover:text-brand-deep">
              All new posts
            </Link>
          </div>
          <LiveBar kind="topics" />
          <ExploreForums onlineIds={onlineIds} />
        </div>
      ) : null}
      {!explore && !cursor ? (
        <div className="mb-6 space-y-4">
          <QuickAsk
            viewer={user ? { username: user.profile.username, display_name: user.profile.display_name, avatar_url: user.profile.avatar_url, trust_level: user.profile.trust_level } : null}
            categories={categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name, parent_id: c.parent_id, min_trust_to_post: c.min_trust_to_post }))}
          />
        </div>
      ) : null}
      {!explore && !cursor ? (
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

      {!explore ? (
      <section aria-labelledby="topics-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h1 id="topics-heading" className="text-xl font-semibold tracking-tight">
            {view === "top" ? "Top this week" : view === "unanswered" ? "Needs an answer" : view === "following" ? "Your feed" : "Latest topics"}
          </h1>
        </div>
        <ViewTabs basePath={urls.community()} view={view} period={period} showFollowing={!!user} />
        <LiveBar kind="topics" categoryIds={categoryIds} />
        <TopicList
          newSince={newSince}
          onlineIds={onlineIds}
          topics={page.topics}
          nextCursor={page.nextCursor}
          moreHref={(c) => `${urls.community()}?view=${view}&period=${period}&cursor=${encodeURIComponent(c)}`}
          sponsorPage={urls.community()}
          emptyMessage={
            view === "unanswered"
              ? "Every topic has a reply. Nice work, everyone."
              : view === "following"
                ? "Nothing yet from the categories you follow. Follow a category from its page to build your feed."
                : "Nothing here yet. Start the first topic."
          }
        />
      </section>
      ) : null}
    </ForumShell>
  );
}
