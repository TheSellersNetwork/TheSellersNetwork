import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { ForumShell } from "@/components/layout/forum-shell";
import { TopicList } from "@/components/forum/topic-list";
import { ViewTabs } from "@/components/forum/view-tabs";
import { Button } from "@/components/ui/button";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { FollowButton } from "@/components/forum/follow-button";
import { getCurrentUser } from "@/lib/auth";
import { after } from "next/server";
import { getCategories, getCategoryBySlug, getCategoryFollows, getTopics } from "@/lib/forum/queries";
import { getOnlineMembers } from "@/lib/forum/live-queries";
import { LiveBar } from "@/components/forum/live-bar";
import { recordCategoryVisit } from "@/app/community/presence-actions";
import { createClient } from "@/lib/supabase/server";
import { getCoverImages, getDealOrder } from "@/lib/forum/extras-queries";
import { GalleryGrid } from "@/components/forum/gallery-grid";
import { urls } from "@/lib/forum/urls";
import type { TopicListView, TopPeriod } from "@/lib/db/types";

export async function generateMetadata({ params }: PageProps<"/community/c/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return {
    title: category.name,
    description: category.description ?? undefined,
    alternates: { canonical: urls.category(category.slug) },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/community/c/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const view: TopicListView = sp.view === "top" || sp.view === "unanswered" ? sp.view : "latest";
  const period: TopPeriod = sp.period === "day" || sp.period === "month" || sp.period === "all" ? sp.period : "week";
  const cursor = typeof sp.cursor === "string" ? sp.cursor : null;

  const [all, viewer] = await Promise.all([getCategories(), getCurrentUser()]);
  const follows = viewer ? await getCategoryFollows(viewer.id) : new Map<string, "following" | "muted">();
  const canStartTopic = category.accepting_topics || !!viewer?.profile.is_staff;
  const parent = category.parent_id ? all.find((c) => c.id === category.parent_id) : null;
  const children = all.filter((c) => c.parent_id === category.id);
  const categoryIds = [category.id, ...children.map((c) => c.id)];

  const [rawPage, online] = await Promise.all([getTopics({ view, period, cursor, categoryIds, includePinnedFirst: view === "latest", limit: category.layout === "list" ? undefined : 50 }), getOnlineMembers(50)]);
  // Deals forums sort by heat; gallery forums show photo tiles.
  const dealOrder = category.layout === "deals" && view === "latest" ? await getDealOrder(category.id) : null;
  const page = dealOrder
    ? { ...rawPage, topics: [...rawPage.topics].sort((a, b) => (dealOrder.get(b.id)?.heat ?? -999) - (dealOrder.get(a.id)?.heat ?? -999)) }
    : rawPage;
  const covers = category.layout === "gallery" ? await getCoverImages(page.topics.map((t) => t.id)) : null;
  const onlineIds = new Set(online.map((m) => m.id));
  const basePath = urls.category(category.slug);

  // Remember the previous visit for New pills, then record this one after the response.
  let newSince: string | null = null;
  if (viewer) {
    const supabase = await createClient();
    const { data: visit } = await supabase.from("category_visits").select("visited_at").eq("user_id", viewer.id).eq("category_id", category.id).maybeSingle();
    newSince = (visit?.visited_at as string | undefined) ?? null;
    after(() => recordCategoryVisit(viewer.id, category.id));
  }

  return (
    <ForumShell activeCategory={category.slug} source={basePath}>
      <BreadcrumbJsonLd
        items={[
          { name: "Community", url: urls.community() },
          ...(parent ? [{ name: parent.name, url: urls.category(parent.slug) }] : []),
          { name: category.name, url: basePath },
        ]}
      />
      <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted-foreground">
        <Link href={urls.community()} className="hover:underline">
          Community
        </Link>
        {parent ? (
          <>
            {" / "}
            <Link href={urls.category(parent.slug)} className="hover:underline">
              {parent.name}
            </Link>
          </>
        ) : null}
      </nav>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <span className="h-7 w-1 rounded-full" style={{ background: `var(--cat-${category.colour})` }} aria-hidden="true" />
            {category.name}
          </h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">{category.description ?? ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FollowButton categoryId={category.id} level={follows.get(category.id) ?? null} signedIn={!!viewer} />
          {canStartTopic ? (
            <Button asChild>
              <Link href={urls.newTopic(category.slug)}>
                <Plus data-icon="inline-start" />
                New topic
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      {!category.accepting_topics ? (
        <p className="mb-4 rounded-lg border bg-brand-soft/60 p-3 text-sm">
          New questions are closed for now. {category.accepting_note ?? "Check back soon."}
        </p>
      ) : null}
      {children.length > 0 ? (
        <ul className="mb-4 flex flex-wrap gap-2 text-sm">
          {children.map((c) => (
            <li key={c.id}>
              <Link href={urls.category(c.slug)} className="rounded-full border px-3 py-1 hover:bg-secondary">
                {c.name} <span className="text-muted-foreground">{c.topic_count}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <ViewTabs basePath={basePath} view={view} period={period} />
      <LiveBar kind="topics" categoryIds={categoryIds} />
      {covers ? (
        <GalleryGrid topics={page.topics} covers={covers} emptyMessage="No photos yet. Post yours with a picture of your setup." />
      ) : (
      <TopicList
        newSince={newSince}
        onlineIds={onlineIds}
        dealMeta={dealOrder ?? undefined}
        topics={page.topics}
        nextCursor={page.nextCursor}
        moreHref={(c) => `${basePath}?view=${view}&period=${period}&cursor=${encodeURIComponent(c)}`}
        showCategory={children.length > 0}
        sponsorPage={basePath}
        emptyMessage="Nothing here yet. Start the first topic."
      />
      )}
    </ForumShell>
  );
}
