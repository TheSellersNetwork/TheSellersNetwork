import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { PlatformChip, StatusBadge } from "@/components/changes/change-badges";
import { PostCard, type PostCardItem } from "@/components/content/post-card";
import { EmailSignupCard } from "@/components/marketing/email-signup-card";
import { getBlogPosts } from "@/lib/content/blog";
import { blogGroups, groupOf, isLiveItem, matchesType, parseBlogType, pickFeatured, type BlogGroupId } from "@/lib/content/blog-index";
import { isScheduled, publishedUkDate } from "@/lib/content/schedule";
import { getChangeReadingTimes, getChanges } from "@/lib/content/changes";
import { getAuthor } from "@/lib/content/authors";
import { getChangeReplyCounts } from "@/lib/forum/change-discussions";
import { effectiveStatus } from "@/lib/tools/changes";
import { urls } from "@/lib/forum/urls";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Fee and policy changes on eBay, Amazon, Vinted, Depop, TikTok Shop, Royal Mail and HMRC, broken down in plain English, plus articles and the weekly forum roundup.",
  alternates: { canonical: urls.blog() },
};

/* Rendered per request, so a scheduled post appears on its UK publish date without a rebuild. */
export const dynamic = "force-dynamic";

/* Platform filter. Postage and tax group several sources together. */
const platforms = [
  { id: "ebay", label: "eBay", match: ["ebay"] },
  { id: "amazon", label: "Amazon", match: ["amazon"] },
  { id: "vinted", label: "Vinted", match: ["vinted"] },
  { id: "depop", label: "Depop", match: ["depop"] },
  { id: "tiktok-shop", label: "TikTok Shop", match: ["tiktok-shop"] },
  { id: "etsy", label: "Etsy", match: ["etsy"] },
  { id: "postage", label: "Postage", match: ["royal-mail", "evri"] },
  { id: "tax", label: "Tax and rules", match: ["hmrc", "general"] },
] as const;

/* Rows shown on the unfiltered index before "See all". */
const ROW_LIMIT = 3;

type Item = PostCardItem & { category: string | null; platforms: string[]; featuredFlag: boolean };

function href(type: string, platform: string) {
  const q = new URLSearchParams();
  if (type !== "all") q.set("type", type);
  if (platform !== "all") q.set("platform", platform);
  const s = q.toString();
  return s ? `${urls.blog()}?${s}` : urls.blog();
}

const groupLabel = (id: BlogGroupId) => blogGroups.find((g) => g.id === id)!.label;
/* Singular label for an article's chip, from its row. */
const chipLabels: Record<BlogGroupId, string> = {
  comparisons: "Comparison",
  debates: "Debate",
  explainers: "Explainer",
  myths: "Myth vs reality",
  changes: "Fee and policy change",
  community: "Community",
  consumer: "Consumer",
  more: "Article",
};

export default async function BlogPage({ searchParams }: PageProps<"/blog">) {
  const sp = await searchParams;
  const type = parseBlogType(sp.type);
  const platform = platforms.find((p) => p.id === sp.platform) ?? null;

  const [posts, changes, changeMinutes] = await Promise.all([getBlogPosts(), getChanges(), getChangeReadingTimes()]);
  const counts = await getChangeReplyCounts(changes.map((c) => c.discussion).filter((s): s is string => !!s));

  const all: Item[] = [
    ...changes.map((c): Item => {
      const a = getAuthor(c.author, c.platform);
      return {
        slug: c.slug,
        title: c.title,
        excerpt: c.summary,
        date: c.date,
        updated: null,
        kind: "change",
        typeLabel: chipLabels.changes,
        category: null,
        platforms: [c.platform],
        author: a.name,
        initials: a.initials,
        minutes: changeMinutes.get(c.slug) ?? 1,
        change: c,
        replies: c.discussion ? (counts.get(c.discussion) ?? 0) : 0,
        featuredFlag: false,
      };
    }),
    ...posts.map((p): Item => {
      const a = p.author ? getAuthor(p.author) : null;
      return {
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        date: p.published ? publishedUkDate(p.published) : null,
        updated: p.updated ? publishedUkDate(p.updated) : null,
        scheduled: isScheduled(p.published) ? publishedUkDate(p.published!) : null,
        kind: "article",
        typeLabel: chipLabels[groupOf({ kind: "article", category: p.category, slug: p.slug })],
        category: p.category,
        platforms: p.platforms as string[],
        author: a ? a.name : "The Sellers Network",
        initials: a ? a.initials : "SN",
        minutes: p.minutes,
        replies: 0,
        featuredFlag: p.featured,
      };
    }),
  ]
    .filter((i) => !platform || i.platforms.some((p) => (platform.match as readonly string[]).includes(p)))
    .sort((a, b) => (b.date ?? "9").localeCompare(a.date ?? "9"));

  const inType = all.filter((i) => matchesType(i, type));
  const live = inType.filter(isLiveItem);
  /* Drafts and scheduled posts only reach this list outside production (see src/lib/content/blog.ts). */
  const staffPreview = inType.filter((i) => !isLiveItem(i)).sort((a, b) => (a.date ?? "9").localeCompare(b.date ?? "9"));

  const grouped = type === "all" || type === "articles";
  const featured = grouped ? pickFeatured(live.map((i) => ({ ...i, featured: i.featuredFlag }))) : null;
  const rows = blogGroups
    .map((g) => ({ ...g, items: live.filter((i) => i.slug !== featured?.slug && groupOf(i) === g.id) }))
    .filter((g) => g.items.length > 0);

  /* Chip counts use the platform filter but not the type filter, so each chip says what it would show. */
  const liveAll = all.filter(isLiveItem);
  const chips = [
    { id: "all" as const, label: "Everything", count: liveAll.length },
    ...blogGroups.map((g) => ({ id: g.id, label: g.label, count: liveAll.filter((i) => matchesType(i, g.id)).length })).filter((c) => c.count > 0 || c.id === type),
  ];

  const upcoming = type === "all" || type === "changes" ? inType.filter((i) => i.change && effectiveStatus(i.change) !== "in-effect").sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")) : [];

  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">The Sellers Network blog</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Platforms announce changes in long posts full of small print. We break each one down in plain English: what changed, who it hits, what it costs you and what to do. Then sellers compare notes underneath.
      </p>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Spotted a change we have missed? Post it in{" "}
        <Link href={urls.category("deals")} className="underline">
          Deals and fee changes
        </Link>{" "}
        with the link and we will write it up.
      </p>

      <nav aria-label="Type" className="-mx-4 mt-6 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 [&::-webkit-scrollbar]:hidden sm:overflow-visible sm:px-0">
        <ul className="flex w-max gap-1.5 sm:w-auto sm:flex-wrap">
          {chips.map((t) => (
            <li key={t.id}>
              <Link
                href={href(t.id, platform?.id ?? "all")}
                aria-current={type === t.id ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors motion-reduce:transition-none sm:min-h-9",
                  type === t.id ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-secondary",
                )}
              >
                {t.label}
                <span className={cn("tabular-nums text-xs", type === t.id ? "text-background/75" : "text-muted-foreground")}>{t.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <nav aria-label="Platform" className="-mx-4 mt-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 [&::-webkit-scrollbar]:hidden sm:overflow-visible sm:px-0">
        <ul className="flex w-max gap-1 sm:w-auto sm:flex-wrap">
          {[{ id: "all", label: "All platforms" }, ...platforms].map((p) => (
            <li key={p.id}>
              <Link
                href={href(type, p.id)}
                aria-current={(platform?.id ?? "all") === p.id ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-3 text-xs sm:min-h-7",
                  (platform?.id ?? "all") === p.id ? "border-brand bg-brand/15" : "hover:bg-secondary",
                )}
              >
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {featured ? (
        <section aria-label="Featured post" className="mt-8">
          <PostCard item={featured} featured={featured.featuredFlag ? "Featured" : "Latest"} headingLevel={2} />
        </section>
      ) : null}

      {upcoming.length > 0 ? (
        <section aria-labelledby="upcoming-heading" className="mt-8 rounded-xl border-2 border-brand/40 bg-card p-4">
          <h2 id="upcoming-heading" className="flex items-center gap-2 font-semibold">
            <CalendarClock className="size-4 text-brand" aria-hidden="true" /> Coming up and announced
          </h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">
            {upcoming.map((i) => (
              <li key={i.slug}>
                <div className="flex flex-wrap items-center gap-2">
                  <PlatformChip platform={i.change!.platform} />
                  <StatusBadge change={i.change!} />
                </div>
                <Link href={urls.blogPost(i.slug)} className="mt-1 block font-medium hover:underline">
                  {i.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {live.length === 0 && staffPreview.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nothing here yet. Try another filter.</p>
      ) : grouped ? (
        rows.map((g) => (
          <section key={g.id} aria-labelledby={`row-${g.id}`} className="mt-12">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
              <h2 id={`row-${g.id}`} className="font-serif text-2xl font-semibold tracking-tight">
                {g.label}
              </h2>
              {g.items.length > ROW_LIMIT ? (
                <Link href={href(g.id, platform?.id ?? "all")} className="inline-flex min-h-11 items-center text-sm text-brand underline-offset-4 hover:underline sm:min-h-0">
                  See all {g.items.length}
                  <span className="sr-only"> {g.label.toLowerCase()} posts</span>
                </Link>
              ) : null}
            </div>
            <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.slice(0, ROW_LIMIT).map((i) => (
                <li key={i.slug}>
                  <PostCard item={i} />
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <section aria-labelledby="type-heading" className="mt-10">
          <h2 id="type-heading" className="border-b pb-2 font-serif text-2xl font-semibold tracking-tight">
            {groupLabel(type as BlogGroupId)}
          </h2>
          {live.length === 0 ? (
            <p className="mt-5 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nothing published here yet.</p>
          ) : (
            <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {live.map((i) => (
                <li key={i.slug}>
                  <PostCard item={i} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {staffPreview.length > 0 ? (
        <section aria-labelledby="row-scheduled" className="mt-12 rounded-xl border border-dashed p-4 sm:p-5" data-testid="scheduled-row">
          <h2 id="row-scheduled" className="flex items-center gap-2 font-serif text-2xl font-semibold tracking-tight">
            <CalendarClock className="size-5 text-brand" aria-hidden="true" /> Scheduled
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Staff preview only. Readers see each post on its publish date. Drafts stay hidden until they are dated.</p>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {staffPreview.map((i) => (
              <li key={i.slug}>
                <PostCard item={i} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-12 max-w-2xl">
        <EmailSignupCard source="/blog" variant="inline" />
      </div>
    </main>
  );
}
