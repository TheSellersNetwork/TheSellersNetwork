import type { Metadata } from "next";
import Link from "next/link";
import { ForumShell } from "@/components/layout/forum-shell";
import { BadgeIcon } from "@/components/profile/badges";
import { badges } from "@/lib/badges";
import { getBadgeHolderCounts, getProfileBadges } from "@/lib/badges-queries";
import { getCurrentUser } from "@/lib/auth";
import { longDate } from "@/lib/format";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Badges",
  description: "The badges members earn on The Sellers Network and how each one is earned.",
  alternates: { canonical: "/community/badges" },
};
export const dynamic = "force-dynamic";

/*
  Every badge, how it is earned and how many members hold it. Badges are
  worked out from what members have actually done, so there is nothing to
  apply for and nothing handed out by hand.
*/
export default async function BadgesPage() {
  const viewer = await getCurrentUser();
  const [counts, mine] = await Promise.all([getBadgeHolderCounts(), viewer ? getProfileBadges(viewer.id) : Promise.resolve([])]);
  const foundingDate = longDate(`${siteConfig.foundingUntil}T12:00:00Z`).split(" at")[0];

  return (
    <ForumShell source="/community/badges">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/community" className="hover:underline">
          Community
        </Link>
      </nav>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Badges</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Badges come from what members have actually done here: answers marked as solved, weeks in the numbers thread, pickups shared and sold. There is nothing to apply for: they show on your profile as soon as you have earned them.
      </p>

      <ul className="mt-8 divide-y rounded-xl border bg-card">
        {badges.map((b) => {
          const held = counts[b.id];
          const earned = mine.includes(b.id);
          return (
            <li key={b.id} id={b.id} className="flex scroll-mt-[calc(var(--header-height)+1rem)] gap-4 p-4 target:bg-brand-soft sm:p-5">
              <BadgeIcon id={b.id} className="size-11" />
              <div className="min-w-0 flex-1">
                <h2 className="flex flex-wrap items-center gap-x-2 font-semibold">
                  {b.name}
                  {earned ? <span className="rounded bg-success/10 px-1.5 py-0.5 text-xs font-medium text-success">You have this</span> : null}
                </h2>
                <p className="mt-0.5 text-sm">
                  {b.id === "founding" ? `Joined on or before ${foundingDate}. Staff are left out: they have Team.` : b.rule}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{held > 0 ? `${held} ${held === 1 ? "member holds" : "members hold"} this` : "No one yet"}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
        Streak badges count the weekly &ldquo;What did you sell this week&rdquo; thread: post in it in consecutive weeks. Once earned, a badge stays even if the streak ends.
      </p>
    </ForumShell>
  );
}
