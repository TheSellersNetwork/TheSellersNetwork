import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, MessageCircle } from "lucide-react";
import { ImpactBadge, PlatformChip, StatusBadge } from "@/components/changes/change-badges";
import { EmailSignupCard } from "@/components/marketing/email-signup-card";
import { getBlogPosts } from "@/lib/content/blog";
import { getChanges } from "@/lib/content/changes";
import { getAuthor } from "@/lib/content/authors";
import { getChangeReplyCounts } from "@/lib/forum/change-discussions";
import { effectiveStatus, formatChangeDate, type ChangeMeta } from "@/lib/tools/changes";
import { urls } from "@/lib/forum/urls";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Fee and policy changes on eBay, Amazon, Vinted, Depop, TikTok Shop, Royal Mail and HMRC, broken down in plain English, plus articles and the weekly forum roundup.",
  alternates: { canonical: urls.blog() },
};

const types = [
  { id: "all", label: "Everything" },
  { id: "changes", label: "Fee and policy changes" },
  { id: "articles", label: "Articles" },
] as const;

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

type Item = {
  slug: string;
  title: string;
  excerpt: string;
  date: string | null;
  kind: "change" | "article";
  platforms: string[];
  author: string;
  initials: string;
  change?: ChangeMeta;
  replies: number;
};

function href(type: string, platform: string) {
  const q = new URLSearchParams();
  if (type !== "all") q.set("type", type);
  if (platform !== "all") q.set("platform", platform);
  const s = q.toString();
  return s ? `${urls.blog()}?${s}` : urls.blog();
}

export default async function BlogPage({ searchParams }: PageProps<"/blog">) {
  const sp = await searchParams;
  const type = types.find((t) => t.id === sp.type)?.id ?? "all";
  const platform = platforms.find((p) => p.id === sp.platform) ?? null;

  const [posts, changes] = await Promise.all([getBlogPosts(), getChanges()]);
  const counts = await getChangeReplyCounts(changes.map((c) => c.discussion).filter((s): s is string => !!s));

  const items: Item[] = [
    ...changes.map((c) => {
      const a = getAuthor(c.author, c.platform);
      return {
        slug: c.slug,
        title: c.title,
        excerpt: c.summary,
        date: c.date,
        kind: "change" as const,
        platforms: [c.platform],
        author: a.name,
        initials: a.initials,
        change: c,
        replies: c.discussion ? (counts.get(c.discussion) ?? 0) : 0,
      };
    }),
    ...posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      date: p.published ? p.published.slice(0, 10) : null,
      kind: "article" as const,
      platforms: p.platforms as string[],
      author: "The Sellers Network",
      initials: "SN",
      replies: 0,
    })),
  ]
    .filter((i) => type === "all" || (type === "changes" ? i.kind === "change" : i.kind === "article"))
    .filter((i) => !platform || i.platforms.some((p) => (platform.match as readonly string[]).includes(p)))
    .sort((a, b) => (b.date ?? "9").localeCompare(a.date ?? "9"));

  const upcoming = type === "articles" ? [] : items.filter((i) => i.change && effectiveStatus(i.change) !== "in-effect").sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

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

      <nav aria-label="Type" className="mt-6 flex flex-wrap gap-1">
        {types.map((t) => (
          <Link
            key={t.id}
            href={href(t.id, platform?.id ?? "all")}
            aria-current={type === t.id ? "page" : undefined}
            className={cn("rounded-full border px-3 py-1 text-sm", type === t.id ? "border-foreground bg-foreground text-background" : "hover:bg-secondary")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <nav aria-label="Platform" className="mt-2 flex flex-wrap gap-1">
        {[{ id: "all", label: "All platforms" }, ...platforms].map((p) => (
          <Link
            key={p.id}
            href={href(type, p.id)}
            aria-current={(platform?.id ?? "all") === p.id ? "page" : undefined}
            className={cn("rounded-full border px-3 py-0.5 text-xs", (platform?.id ?? "all") === p.id ? "border-brand bg-brand/15" : "hover:bg-secondary")}
          >
            {p.label}
          </Link>
        ))}
      </nav>

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

      {items.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nothing here yet. Try another filter.</p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <li key={i.slug} className="forum-card row-enter relative flex flex-col rounded-lg border bg-card p-5 hover:border-brand/60">
              <div className="flex flex-wrap items-center gap-1.5">
                {i.change ? (
                  <>
                    <PlatformChip platform={i.change.platform} />
                    <ImpactBadge impact={i.change.impact} />
                  </>
                ) : (
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">Article</span>
                )}
              </div>
              <h2 className="mt-3 font-serif text-xl font-semibold leading-snug">
                <Link href={urls.blogPost(i.slug)} className="after:absolute after:inset-0">
                  {i.title}
                </Link>
              </h2>
              <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{i.excerpt}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex size-6 items-center justify-center rounded-full bg-brand/15 text-[10px] font-semibold text-brand" aria-hidden="true">
                  {i.initials}
                </span>
                <span className="font-medium text-foreground">{i.author}</span>
                <span aria-hidden="true">·</span>
                <span>{i.date ? formatChangeDate(i.date) : "Draft"}</span>
                {i.replies > 0 ? (
                  <span className="ml-auto inline-flex items-center gap-1">
                    <MessageCircle className="size-3.5" aria-hidden="true" /> {i.replies}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 max-w-2xl">
        <EmailSignupCard source="/blog" variant="inline" />
      </div>
    </main>
  );
}
