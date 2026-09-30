import { calculatorSlugs, toolGroups } from "@/lib/tools/catalogue";
import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBlogPosts } from "@/lib/content/blog";
import { isLive } from "@/lib/content/schedule";
import { getGuides } from "@/lib/content/guides";
import { getChanges } from "@/lib/content/changes";
import { getCategories } from "@/lib/forum/queries";
import { siteConfig } from "@/lib/site";
import { categoryHasTopics, MIN_TAG_TOPICS } from "@/lib/forum/seo";

/*
  Split sitemaps: 0 is static pages, categories, guides and blog posts;
  1 onwards are topics in pages of 5,000. Regenerated hourly by revalidate,
  so a scheduled blog post joins within an hour of its UK publish date.
  Profiles are not included (noindex). Forums join once they have a topic and
  tags once they have MIN_TAG_TOPICS, matching the pages' own robots rules.
*/
export const revalidate = 3600;

const TOPICS_PER_SITEMAP = 5000;

export async function generateSitemaps() {
  let topicCount = 0;
  try {
    const admin = createAdminClient();
    const { count } = await admin.from("topics").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("is_unlisted", false);
    topicCount = count ?? 0;
  } catch {
    topicCount = 0;
  }
  const topicSitemaps = Math.max(1, Math.ceil(topicCount / TOPICS_PER_SITEMAP));
  return Array.from({ length: topicSitemaps + 1 }, (_, i) => ({ id: i }));
}

async function indexableTags(): Promise<string[]> {
  try {
    const { data } = await createAdminClient().from("tags").select("slug").gte("topic_count", MIN_TAG_TOPICS).order("topic_count", { ascending: false }).limit(1000);
    return (data ?? []).map((t) => t.slug as string);
  } catch {
    return [];
  }
}

// In Next 16 the id arrives as a promise of a string, so await it and convert before comparing.
export default async function sitemap(props: { id: Promise<string> | string | number }): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  const base = siteConfig.url;

  if (id === 0) {
    const [categories, guides, posts, changes, tags] = await Promise.all([getCategories().catch(() => []), getGuides(), getBlogPosts(), getChanges(), indexableTags()]);
    return [
      { url: base, changeFrequency: "weekly", priority: 1 },
      { url: `${base}/community`, changeFrequency: "hourly", priority: 0.9 },
      { url: `${base}/community/rules`, changeFrequency: "yearly", priority: 0.3 },
      { url: `${base}/blog`, changeFrequency: "daily", priority: 0.8 },
      { url: `${base}/guides`, changeFrequency: "weekly", priority: 0.8 },
      { url: `${base}/newsletter`, changeFrequency: "weekly", priority: 0.6 },
      { url: `${base}/about`, changeFrequency: "monthly", priority: 0.4 },
      ...categories.filter((c) => !c.is_private && categoryHasTopics(c, categories)).map((c) => ({ url: `${base}/community/c/${c.slug}`, changeFrequency: "hourly" as const, priority: 0.7 })),
      ...tags.map((slug) => ({ url: `${base}/community/tag/${slug}`, changeFrequency: "daily" as const, priority: 0.5 })),
      ...guides.filter((g) => g.published).map((g) => ({ url: `${base}/guides/${g.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
      ...changes.map((c) => ({ url: `${base}/blog/${c.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
      ...[...new Set(["/tools", "/tools/glossary", ...toolGroups.flatMap((g) => g.tools.map((t) => t.href)).filter((h) => h.startsWith("/tools/")), ...calculatorSlugs.map((s) => `/tools/calculator/${s}`), "/tools/calculator/compare", "/tools/calculator/embed", "/guides/paths", "/guides/series", "/community/badges", "/community/pickups", "/community/pickups/bolo"])].map((p) => ({ url: `${base}${p}`, changeFrequency: "monthly" as const, priority: 0.6 })),
      ...posts.filter((p) => isLive(p.published)).map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.updated ?? p.published ?? undefined, changeFrequency: "monthly" as const, priority: 0.7 })),
    ];
  }

  try {
    const admin = createAdminClient();
    const from = (id - 1) * TOPICS_PER_SITEMAP;
    const { data } = await admin
      .from("topics")
      .select("slug, short_id, last_post_at, category:categories!inner (is_private)")
      .is("deleted_at", null)
      .eq("is_unlisted", false)
      .eq("category.is_private", false)
      .order("created_at", { ascending: true })
      .range(from, from + TOPICS_PER_SITEMAP - 1);
    return (data ?? []).map((t) => ({
      url: `${base}/community/t/${t.slug}/${t.short_id}`,
      lastModified: t.last_post_at as string,
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));
  } catch {
    return [];
  }
}
