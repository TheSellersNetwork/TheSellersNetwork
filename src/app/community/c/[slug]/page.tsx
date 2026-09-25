import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { ForumShell } from "@/components/layout/forum-shell";
import { TopicList } from "@/components/forum/topic-list";
import { ViewTabs } from "@/components/forum/view-tabs";
import { Button } from "@/components/ui/button";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { getCategories, getCategoryBySlug, getTopics } from "@/lib/forum/queries";
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

  const all = await getCategories();
  const parent = category.parent_id ? all.find((c) => c.id === category.parent_id) : null;
  const children = all.filter((c) => c.parent_id === category.id);
  const categoryIds = [category.id, ...children.map((c) => c.id)];

  const page = await getTopics({ view, period, cursor, categoryIds, includePinnedFirst: view === "latest" });
  const basePath = urls.category(category.slug);

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
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">{category.description ?? "[TOM: category intro]"}</p>
        </div>
        <Button asChild>
          <Link href={urls.newTopic(category.slug)}>
            <Plus data-icon="inline-start" />
            New topic
          </Link>
        </Button>
      </div>
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
      <TopicList
        topics={page.topics}
        nextCursor={page.nextCursor}
        moreHref={(c) => `${basePath}?view=${view}&period=${period}&cursor=${encodeURIComponent(c)}`}
        showCategory={children.length > 0}
        emptyMessage="[TOM: empty category message]"
      />
    </ForumShell>
  );
}
