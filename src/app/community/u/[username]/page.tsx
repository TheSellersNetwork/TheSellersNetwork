import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ForumShell } from "@/components/layout/forum-shell";
import { TopicList } from "@/components/forum/topic-list";
import { UserAvatar } from "@/components/forum/user-avatar";
import { Badge } from "@/components/ui/badge";
import { FlairChips, StreakChip } from "@/components/forum/flair-chips";
import { getKitsForUser, getStreak } from "@/lib/forum/extras-queries";
import { getCurrentUser } from "@/lib/auth";
import { getProfileActivity, getProfileByUsername } from "@/lib/forum/queries";
import { getAnonymousAccountId } from "@/lib/forum/anonymous";
import { FoundingChip } from "@/components/forum/founding-chip";
import { displayName, isFoundingMember, longDate, plural, timeAgo, trustLabel } from "@/lib/format";
import { excerpt } from "@/lib/markdown/render";
import { urls } from "@/lib/forum/urls";
import { siteConfig } from "@/lib/site";
import { ActivityCalendar } from "@/components/profile/activity-calendar";
import { BadgeChips, ProfileBadges } from "@/components/profile/badges";
import { PickupMasonry } from "@/components/pickups/pickup-masonry";
import { getActivityEvents, getProfileBadges } from "@/lib/badges-queries";
import { buildActivity } from "@/lib/badges-activity";
import { getPickupsForUser } from "@/lib/pickups-queries";

export async function generateMetadata({ params }: PageProps<"/community/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) return {};
  return { title: `${displayName(profile)} (@${profile.username})`, robots: { index: false, follow: true } };
}

const ACTIVITY_WEEKS = 52;
const PICKUPS_SHOWN = 12;

/* Profiles are noindexed per the brief. */
export default async function ProfilePage({ params }: PageProps<"/community/u/[username]">) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  // The shared anonymous account has no public profile; listing its posts would only help guess who wrote them.
  if (!profile || profile.id === (await getAnonymousAccountId())) notFound();

  const [activity, viewer, streak, kits, earned, events, pickups] = await Promise.all([
    getProfileActivity(profile.id),
    getCurrentUser(),
    getStreak(profile.id),
    getKitsForUser(profile.id),
    getProfileBadges(profile.id),
    getActivityEvents(profile.id, ACTIVITY_WEEKS),
    getPickupsForUser(profile.id, PICKUPS_SHOWN + 1),
  ]);
  const calendar = buildActivity(events, new Date(), ACTIVITY_WEEKS);
  const publicKits = kits.filter((k) => k.is_public || viewer?.id === profile.id);
  const isOwn = viewer?.id === profile.id;
  const marketplaces = siteConfig.marketplaces.filter((m) => (profile.marketplaces as string[]).includes(m.id));

  return (
    <ForumShell source={urls.profile(profile.username)}>
      <header className="flex flex-wrap items-start gap-5 rounded-lg border bg-card p-5">
        <UserAvatar profile={profile} size="xl" link={false} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{displayName(profile)}</h1>
          <p className="text-muted-foreground">@{profile.username}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary">{trustLabel(profile.trust_level, profile.is_staff)}</Badge>
            {isFoundingMember(profile, siteConfig.foundingUntil) ? <FoundingChip /> : null}
            <StreakChip weeks={streak} />
            {marketplaces.map((m) => (
              <Badge key={m.id} variant="outline">
                {m.label}
              </Badge>
            ))}
          </div>
          <FlairChips flair={profile.flair} limit={6} className="mt-2 block" />
          <BadgeChips ids={earned.filter((b) => b !== "founding" && b !== "team")} className="mt-2" />
          {profile.bio ? <p className="mt-3 max-w-prose whitespace-pre-line text-sm">{profile.bio}</p> : null}
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <div>
              <dt className="inline">Joined </dt>
              <dd className="inline">{longDate(profile.created_at).split(" at")[0]}</dd>
            </div>
            <div>
              <dt className="inline">Posts </dt>
              <dd className="inline">{profile.post_count}</dd>
            </div>
            <div>
              <dt className="inline">Likes received </dt>
              <dd className="inline">{profile.likes_received}</dd>
            </div>
            {profile.last_seen_at ? (
              <div>
                <dt className="inline">Last seen </dt>
                <dd className="inline">{timeAgo(profile.last_seen_at)} ago</dd>
              </div>
            ) : null}
          </dl>
        </div>
        {isOwn ? (
          <Link href={urls.account()} className="text-sm text-brand underline underline-offset-2 hover:text-brand-deep">
            Edit profile
          </Link>
        ) : null}
      </header>

      {profile.trust_level >= 2 && !profile.is_staff && process.env.NEXT_PUBLIC_SHOW_MENTORING === "true" ? (
        <aside className="mt-4 rounded-lg bg-brand-soft p-4 text-sm">
          Mentoring is available for established members.{" "}
          <Link href="/mentoring" className="font-medium text-brand underline underline-offset-2 hover:text-brand-deep">
            About mentoring
          </Link>
        </aside>
      ) : null}

      <section aria-labelledby="activity-heading" className="mt-8">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="activity-heading" className="text-lg font-semibold">
            Activity
          </h2>
          <p className="text-sm text-muted-foreground">
            {calendar.total === 0
              ? "Nothing posted in the last year."
              : `${plural(calendar.total, "topic, reply or pickup", "topics, replies and pickups")} in the last year, active in ${plural(calendar.activeWeeks, "week")}`}
          </p>
        </div>
        <ActivityCalendar activity={calendar} />
      </section>

      <ProfileBadges ids={earned} own={isOwn} />

      <section aria-labelledby="pickups-heading" className="mt-8">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="pickups-heading" className="text-lg font-semibold">
            Pickups
          </h2>
          {pickups.length > PICKUPS_SHOWN ? <p className="text-sm text-muted-foreground">Latest {PICKUPS_SHOWN}</p> : null}
        </div>
        {pickups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isOwn ? (
              <>
                No pickups yet.{" "}
                <Link href="/community/pickups/new" className="text-brand underline underline-offset-2 hover:text-brand-deep">
                  Share what you found
                </Link>
                .
              </>
            ) : (
              "No pickups yet."
            )}
          </p>
        ) : (
          <PickupMasonry pickups={pickups.slice(0, PICKUPS_SHOWN)} showAuthor={false} label={`Pickups by ${displayName(profile)}`} heading="h3" />
        )}
      </section>

      {publicKits.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Setups</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {publicKits.map((k) => (
              <li key={k.id} className="forum-card rounded-lg border bg-card p-3 text-sm">
                <Link href={`/kits/${k.id}`} className="font-medium hover:underline">
                  {k.title}
                </Link>
                <span className="ml-2 text-xs text-muted-foreground">{plural(k.item_count, "item")}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Topics</h2>
        <TopicList topics={activity.topics} emptyMessage="No topics yet." />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Recent replies</h2>
        {activity.replies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No replies yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {activity.replies.map((r) => (
              <li key={r.id} className="p-4 text-sm">
                {r.topic ? (
                  <Link href={urls.topic(r.topic, r.post_number)} className="font-medium hover:underline">
                    {r.topic.title}
                  </Link>
                ) : null}
                <p className="mt-1 text-muted-foreground">{excerpt(r.body_md, 200)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{timeAgo(r.created_at)} ago</p>
              </li>
            ))}
          </ul>
        )}
        <p className="sr-only">{plural(activity.replies.length, "reply", "replies")}</p>
      </section>
    </ForumShell>
  );
}
