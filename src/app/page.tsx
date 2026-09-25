import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Bot, Users } from "lucide-react";
import { ActivityTabs } from "@/components/forum/activity-tabs";
import { CommunityStats } from "@/components/forum/community-stats";
import { HeroCards } from "@/components/forum/hero-cards";
import { EmailSignupCard } from "@/components/marketing/email-signup-card";
import { Button } from "@/components/ui/button";
import { getCategories, groupCategories } from "@/lib/forum/queries";
import { getOnlineMembers } from "@/lib/forum/live-queries";
import { getRecentReplies, getRecentTopics } from "@/lib/forum/overview-queries";
import { urls } from "@/lib/forum/urls";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name}: the community for UK resellers` },
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

const paths = [
  { href: "/course", icon: BookOpen, title: "Learn", body: "[TOM: one line on the free email course and the paid course]" },
  { href: "/mentoring", icon: Users, title: "Get mentored", body: "[TOM: one line on group and one-to-one mentoring]" },
  { href: "/autopilot", icon: Bot, title: "Go Autopilot", body: "[TOM: one line on hands-off reselling]" },
];

/*
  The landing page: who Tom is, what is happening in the community right now,
  the three paths, and email capture. Live parts come from the same queries
  as the community front page, so it never looks empty while the forum is busy.
*/
export default async function HomePage() {
  const [categories, replies, topics, online] = await Promise.all([getCategories(), getRecentReplies(6), getRecentTopics(6), getOnlineMembers(50)]);
  const groups = groupCategories(categories).filter((g) => g.slug !== "ask-tom");
  const onlineIds = online.map((m) => m.id);

  return (
    <main id="main" className="flex-1">
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-20">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-medium text-brand">For anyone who buys and sells for profit in the UK</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">[TOM: landing headline]</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">[TOM: landing standfirst, two sentences on who Tom is and what this place is for]</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={urls.signup()}>Join free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={urls.community()}>
                Browse the community
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
          <div className="mt-10">
            <CommunityStats />
          </div>
        </div>
        <div className="row-enter forum-card rounded-xl border bg-card p-5">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Happening now</h2>
          <ActivityTabs replies={replies} topics={topics} onlineIds={onlineIds} compact />
          <Link href={urls.community()} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-deep">
            See everything <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="border-y bg-card/60">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">This week in the community</h2>
          <div className="mt-5">
            <HeroCards />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Three ways in</h2>
        <p className="mt-1 text-muted-foreground">[TOM: one line framing the three paths]</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {paths.map((p) => (
            <Link key={p.href} href={p.href} className="forum-card row-enter group rounded-xl border bg-card p-5 transition-colors hover:border-brand/60">
              <p.icon className="size-6 text-brand" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-semibold group-hover:underline">{p.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y bg-card/60">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">Forums for every platform</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <li key={g.id} className="forum-card rounded-xl border bg-card p-4">
                <Link href={urls.category(g.slug)} className="flex items-center gap-2 font-semibold hover:underline">
                  <span className="h-4 w-1 rounded-full" style={{ background: `var(--cat-${g.colour})` }} aria-hidden="true" />
                  {g.name}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {g.children.length > 0 ? g.children.map((c) => c.name).join(" · ") : (g.description ?? "")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="course" className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <EmailSignupCard source="/" variant="inline" />
      </section>
    </main>
  );
}
