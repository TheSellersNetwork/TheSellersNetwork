import type { Metadata } from "next";
import Link from "next/link";
import { ActivityTabs } from "@/components/forum/activity-tabs";
import { HeroCards } from "@/components/forum/hero-cards";
import { UserAvatar } from "@/components/forum/user-avatar";
import { HeroFeed } from "@/components/home/hero-feed";
import { HeroCopy } from "@/components/home/hero-copy";
import { QuickFeeCheck } from "@/components/home/quick-fee-check";
import { StartHere, type StartTab } from "@/components/home/start-here";
import { EmailSignupCard } from "@/components/marketing/email-signup-card";
import { PlatformTiles } from "@/components/marketing/platform-tiles";
import { MembersStrip } from "@/components/marketing/members-strip";
import { AskFirst } from "@/components/marketing/ask-first";
import { NewsletterProof } from "@/components/marketing/newsletter-proof";
import { PickupsStrip } from "@/components/pickups/pickups-strip";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { getGuides } from "@/lib/content/guides";
import { getHeroSlides } from "@/lib/home/coming-up";
import { getHeroFeed } from "@/lib/home/hero-feed";
import { getCategories } from "@/lib/forum/queries";
import { getOnlineMembers } from "@/lib/forum/live-queries";
import { getRecentReplies, getRecentTopics, getUnansweredTopics } from "@/lib/forum/overview-queries";
import { displayName, timeAgo } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name}: the free forum for UK resellers` },
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

/* Start here: the first guides to read for each platform, in order. Slugs are files in content/guides. */
const startPlan = [
  { id: "ebay", label: "eBay", forum: "ebay", tool: { href: "/tools/fees/ebay", label: "eBay fee calculator" }, guides: ["pricing-from-sold-comps", "ebay-titles-item-specifics-and-search", "promoted-listings", "avoiding-vero-and-suspensions"] },
  { id: "amazon", label: "Amazon", forum: "amazon", tool: { href: "/tools/fba-calculator", label: "FBA profit calculator" }, guides: ["how-to-start-amazon-fba-uk", "amazon-ungating-uk", "amazon-where-the-money-leaks", "amazon-lost-and-damaged-stock-claims"] },
  { id: "vinted", label: "Vinted", forum: "vinted", tool: { href: "/tools/fees/vinted", label: "Vinted fee calculator" }, guides: ["vinted-pro-and-selling-as-a-business", "vinted-postage-options", "vinted-bundles-and-discounts", "vinted-fake-or-not-as-described-claims"] },
  { id: "tiktok", label: "TikTok Shop", forum: "tiktok-shop", tool: { href: "/tools/fees/tiktok-shop", label: "TikTok Shop fee calculator" }, guides: ["tiktok-shop-getting-started-uk", "tiktok-shop-first-live", "tiktok-shop-shipping-and-returns", "tiktok-shop-account-health-and-restricted-products"] },
  { id: "whatnot", label: "Whatnot", forum: "whatnot", tool: { href: "/tools/show-planner", label: "Live show planner" }, guides: ["whatnot-first-show", "live-auctions-and-starting-bids", "live-selling-kit-and-schedule", "packing-orders-after-a-show"] },
  { id: "sourcing", label: "Car boots and charity shops", forum: null, tool: { href: "/tools/trip-cost", label: "Sourcing trip cost" }, guides: ["car-boot-sales-for-resellers", "charity-shop-sourcing", "spotting-fakes-before-you-buy", "returns-pallets-and-liquidation-stock"] },
];

/* What is here, in the words members use. A plain list, not a row of icon cards. */
const whatIsHere = [
  { href: "/community/pickups", title: "Pickups and BOLO", body: "Post what you found, what you paid and what it sold for. Brands with three or more sold comps go on the BOLO list." },
  { href: `${urls.community()}?view=unanswered`, title: "Straight answers", body: "The person who asked marks the answer that worked, and it sits under the question, not on page four." },
  { href: "/tools", title: "Free tools", body: "FVF and fee calculators for every platform, FBA fees, offer maths and where an item nets the most." },
  { href: urls.blog(), title: "Fee and policy changes", body: "When a marketplace or Royal Mail changes something, we explain what it means for your margins in plain English." },
];

export default async function HomePage() {
  const viewer = await getCurrentUser();
  const [categories, replies, topics, unanswered, online, guides] = await Promise.all([
    getCategories(),
    getRecentReplies(6),
    getRecentTopics(6),
    getUnansweredTopics(5),
    getOnlineMembers(50),
    getGuides(),
  ]);
  const [slides, feed] = await Promise.all([getHeroSlides(unanswered), getHeroFeed(topics)]);
  const onlineIds = online.map((m) => m.id);
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const titles = new Map(guides.map((g) => [g.slug, g.title]));
  const startTabs: StartTab[] = startPlan.map((t) => ({
    id: t.id,
    label: t.label,
    tool: t.tool,
    forum: t.forum && bySlug.has(t.forum) ? { href: urls.category(t.forum), label: `Ask in the ${t.label} forum` } : { href: "/community/pickups", label: "Pickups and BOLO" },
    guides: t.guides.filter((s) => titles.has(s)).map((s) => ({ slug: s, title: titles.get(s)! })),
  }));

  return (
    <main id="main" className="flex-1">
      {/* Dark band, whatever the theme. Words on the left, real content drifting behind the revolving card on the right. */}
      <section className="hero-dark border-b bg-background text-foreground">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16 lg:py-16">
          <HeroCopy signedIn={!!viewer} />
          <HeroFeed slides={slides} feed={feed} />
        </div>
      </section>

      {/* Every platform forum in one row */}
      <section className="border-b bg-card/60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">Forums by platform</h2>
            <Link href={urls.community()} className="text-sm text-brand underline-offset-2 hover:underline">
              All forums
            </Link>
          </div>
          <PlatformTiles className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8" />
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-12">
          <PickupsStrip />
          <StartHere tabs={startTabs} />
          <QuickFeeCheck />

          <section aria-labelledby="needs-answer">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="needs-answer" className="text-2xl font-semibold tracking-tight">
                  Can you answer this?
                </h2>
                <p className="mt-1 text-muted-foreground">The newest questions without a reply.</p>
              </div>
              <Link href={`${urls.community()}?view=unanswered`} className="text-sm text-brand underline-offset-2 hover:underline">
                All unanswered
              </Link>
            </div>
            {unanswered.length === 0 ? (
              <p className="mt-5 rounded-xl border border-dashed bg-card p-5 text-sm text-muted-foreground">
                Every question has at least one reply.{" "}
                <Link href={urls.newTopic()} className="text-brand underline underline-offset-2">
                  Ask one
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-5 divide-y rounded-xl border bg-card">
                {unanswered.map((t) => (
                  <li key={t.id} className="group relative flex items-center gap-3 px-4 py-3 hover:bg-secondary/60">
                    <UserAvatar profile={t.author} size="sm" link={false} />
                    <div className="min-w-0 flex-1">
                      <Link href={urls.topic(t)} className="line-clamp-1 font-medium after:absolute after:inset-0 group-hover:underline">
                        {t.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {displayName(t.author)} asked {timeAgo(t.created_at)} ago
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium text-brand group-hover:border-brand/60">Answer</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="this-week">
            <h2 id="this-week" className="text-2xl font-semibold tracking-tight">
              This week in the community
            </h2>
            <div className="mt-5">
              <HeroCards />
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start" aria-label="Community">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-1 font-semibold">Happening now</h2>
            <ActivityTabs replies={replies} topics={topics} onlineIds={onlineIds} compact />
          </div>
          <MembersStrip />
          {viewer ? null : (
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="font-semibold">How to join</h2>
              <ol className="mt-3 space-y-3 text-sm">
                {[
                  ["Tell us where you sell", "Your feed starts with the forums that matter to you."],
                  ["Ask, answer, share your numbers", "Good answers get marked solved and stay at the top."],
                  ["Come back on a Monday", "A weekly thread for what you listed, what sold and what you made."],
                ].map(([title, body], i) => (
                  <li key={title} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold tabular-nums">{i + 1}</span>
                    <span>
                      <span className="font-medium">{title}</span>
                      <span className="block text-muted-foreground">{body}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <Button asChild className="mt-4 w-full">
                <Link href={urls.signup()}>Join free</Link>
              </Button>
            </div>
          )}
        </aside>
      </div>

      <section className="border-y bg-card/60">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
          <AskFirst categories={categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name, parent_id: c.parent_id }))} signedIn={!!viewer} />
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">What is here</h2>
            <dl className="mt-5 divide-y border-y">
              {whatIsHere.map((item) => (
                <div key={item.href} className="py-4">
                  <dt>
                    <Link href={item.href} className="font-semibold text-brand underline-offset-2 hover:underline">
                      {item.title}
                    </Link>
                  </dt>
                  <dd className="mt-1 text-sm text-muted-foreground">{item.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section id="newsletter" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmailSignupCard source="/" variant="inline" />
        <NewsletterProof />
      </section>
    </main>
  );
}
