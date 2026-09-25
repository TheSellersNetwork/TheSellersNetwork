import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight, MessageSquare, Radio, ShoppingBag, Sparkles, Store, Tag, Users } from "lucide-react";
import { ActivityTabs } from "@/components/forum/activity-tabs";
import { CommunityStats } from "@/components/forum/community-stats";
import { HeroCards } from "@/components/forum/hero-cards";
import { UserAvatar } from "@/components/forum/user-avatar";
import { EmailSignupCard } from "@/components/marketing/email-signup-card";
import { HeroCursors } from "@/components/marketing/hero-cursors";
import { Button } from "@/components/ui/button";
import { getCategories } from "@/lib/forum/queries";
import { getCommunityStats, getOnlineMembers } from "@/lib/forum/live-queries";
import { getRecentReplies, getRecentTopics } from "@/lib/forum/overview-queries";
import { displayName } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import { siteConfig } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name}: the free forum for UK resellers` },
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

/* Platforms shown as wordmarks under the hero. Text, not logos, so nothing is borrowed. */
const platforms = ["eBay", "Amazon", "Vinted", "Whatnot", "TikTok Shop", "Etsy", "Depop", "Facebook Marketplace"];

/* The Categories card. Slugs match the seed script. */
const quickCategories = [
  { slug: "ebay", label: "eBay", icon: ShoppingBag },
  { slug: "amazon", label: "Amazon", icon: Store },
  { slug: "vinted", label: "Vinted", icon: Tag },
  { slug: "tiktok-shop", label: "TikTok Shop", icon: Sparkles },
  { slug: "whatnot", label: "Whatnot", icon: Radio },
];

export default async function HomePage() {
  const supabase = await createClient();
  const [categories, replies, topics, online, stats, { data: recentMembers }] = await Promise.all([
    getCategories(),
    getRecentReplies(6),
    getRecentTopics(6),
    getOnlineMembers(50),
    getCommunityStats(),
    supabase.from("profiles").select("id, username, display_name, avatar_url, trust_level, is_staff, solution_count").not("onboarded_at", "is", null).order("created_at", { ascending: false }).limit(4),
  ]);
  const onlineIds = online.map((m) => m.id);
  const members = recentMembers ?? [];
  const bySlug = new Map(categories.map((c) => [c.slug, c]));

  return (
    <main id="main" className="flex-1">
      {/* Dark hero band, whatever the theme, like the reference */}
      <section className="hero-dark relative overflow-hidden bg-background text-foreground">
        <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:py-24">
          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
              <span className="live-dot size-2 rounded-full bg-success" aria-hidden="true" />
              {stats.members >= 25 ? `${stats.members.toLocaleString("en-GB")} members. Free to join` : "Free to join. Always will be"}
            </p>
            <div className="relative mt-6">
              <HeroCursors names={members.map((m) => displayName(m))} />
              <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                The free forum
                <br />
                for UK resellers.
                <br />
                Every platform.
              </h1>
            </div>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Ask a question and get an answer from someone who has actually done it. <span className="text-brand">eBay</span>, <span className="text-brand">Vinted</span>,{" "}
              <span className="text-brand">Whatnot</span>, car boots and everything in between. No fees, no selling in the threads, no nonsense.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={urls.signup()}>Join free</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={urls.community()}>
                  Explore the forums
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
            <ul className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 text-lg font-semibold tracking-tight text-muted-foreground" aria-label="Platforms covered">
              {platforms.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
            {/* How to join */}
            <div className="forum-card row-enter rounded-2xl border bg-card p-6">
              <h2 className="text-lg font-semibold">How to join</h2>
              <ol className="mt-4 space-y-5 border-l pl-5 text-sm">
                <li className="relative">
                  <span className="absolute -left-[26px] top-1 size-2.5 rounded-full border-2 border-brand bg-card" aria-hidden="true" />
                  <p className="font-medium">Tell us where you sell</p>
                  <p className="text-muted-foreground">Your feed starts with the forums that matter to you.</p>
                </li>
                <li className="relative">
                  <span className="absolute -left-[26px] top-1 size-2.5 rounded-full border-2 border-brand bg-brand" aria-hidden="true" />
                  <p className="font-medium">Ask, answer, share your numbers</p>
                  <p className="text-muted-foreground">Good answers get marked solved and stay at the top.</p>
                  {members.length > 0 ? (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {members.slice(0, 3).map((m) => (
                          <UserAvatar key={m.id} profile={m} size="md" className="ring-2 ring-card" online={onlineIds.includes(m.id)} />
                        ))}
                      </div>
                      <Link href={urls.signup()} className="grid size-9 place-items-center rounded-full border bg-background text-sm font-medium hover:border-brand" aria-label="Join">
                        +
                      </Link>
                    </div>
                  ) : null}
                </li>
                <li className="relative">
                  <span className="absolute -left-[26px] top-1 size-2.5 rounded-full border-2 border-border bg-card" aria-hidden="true" />
                  <p className="font-medium">Come back on a Monday</p>
                  <p className="text-muted-foreground">Every week there is a thread for what you listed, what sold and what you made.</p>
                </li>
              </ol>
            </div>

            {/* Categories */}
            <div className="forum-card row-enter rounded-2xl border bg-card p-4">
              <h2 className="flex items-center gap-1.5 text-base font-semibold">
                <Sparkles className="size-4 text-brand" aria-hidden="true" /> Forums
              </h2>
              <ul className="mt-3 space-y-1 text-sm">
                {quickCategories.map((c) => {
                  const cat = bySlug.get(c.slug);
                  return (
                    <li key={c.slug}>
                      <Link href={cat ? urls.category(cat.slug) : urls.community()} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary">
                        <span className="grid size-6 place-items-center rounded-md bg-secondary">
                          <c.icon className="size-3.5" aria-hidden="true" />
                        </span>
                        {c.label}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link href={urls.community()} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-muted-foreground hover:bg-secondary">
                    <span className="grid size-6 place-items-center rounded-md bg-secondary">
                      <ChevronRight className="size-3.5" aria-hidden="true" />
                    </span>
                    More
                  </Link>
                </li>
              </ul>
            </div>

            {/* The short version of the rules */}
            <div className="forum-card row-enter rounded-2xl border bg-card p-5 text-sm sm:col-start-2">
              <p className="font-medium">Three rules, no small print</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>No selling in the threads.</li>
                <li>No links to your listings.</li>
                <li>Real numbers welcome.</li>
              </ul>
              <Link href={urls.rules()} className="mt-2 inline-block text-xs text-brand underline underline-offset-2 hover:text-brand-deep">
                All six house rules
              </Link>
            </div>

            {/* Wide banner */}
            <Link href={urls.guides()} className="forum-card row-enter group flex items-center justify-between gap-4 rounded-2xl border bg-card px-6 py-5 transition-colors hover:border-brand/60 sm:col-span-2">
              <span className="flex items-center gap-3 text-lg font-semibold">
                <BookOpen className="size-5 text-brand" aria-hidden="true" />
                Selling guides
                <ChevronRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
              <span className="flex -space-x-2">
                {["eBay", "Vinted", "Whatnot"].map((p) => (
                  <span key={p} className="grid size-9 place-items-center rounded-full border bg-background text-[10px] font-semibold ring-2 ring-card">
                    {p.slice(0, 2)}
                  </span>
                ))}
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <CommunityStats />
      </section>

      <section className="border-y bg-card/60">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">This week in the community</h2>
            <div className="mt-5">
              <HeroCards />
            </div>
          </div>
          <div className="forum-card rounded-xl border bg-card p-5">
            <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MessageSquare className="size-3.5" aria-hidden="true" /> Happening now
            </h2>
            <ActivityTabs replies={replies} topics={topics} onlineIds={onlineIds} compact />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">What you get here</h2>
        <p className="mt-1 text-muted-foreground">It is a forum. A good one, run properly, and free.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { href: `${urls.community()}?view=unanswered`, icon: MessageSquare, title: "Straight answers", body: "Questions get marked solved by the person who asked. The answer sits at the top of the thread, not on page four." },
            { href: urls.community(), icon: Users, title: "Real numbers", body: "A weekly thread for what you listed, what sold and what you made. Nobody is here to impress anyone." },
            { href: urls.community(), icon: BookOpen, title: "Every platform", body: "eBay, Amazon, Vinted, Whatnot, TikTok Shop, Etsy, Depop, Facebook Marketplace. If you sell on it, there is a forum for it." },
          ].map((p) => (
            <Link key={p.href} href={p.href} className="forum-card row-enter group rounded-xl border bg-card p-5 transition-colors hover:border-brand/60">
              <p.icon className="size-6 text-brand" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-semibold group-hover:underline">{p.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="course" className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <EmailSignupCard source="/" variant="inline" />
      </section>
    </main>
  );
}
