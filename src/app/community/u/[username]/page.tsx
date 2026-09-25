import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ForumShell } from "@/components/layout/forum-shell";
import { TopicList } from "@/components/forum/topic-list";
import { UserAvatar } from "@/components/forum/user-avatar";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { getProfileActivity, getProfileByUsername } from "@/lib/forum/queries";
import { displayName, longDate, plural, timeAgo, trustLabel } from "@/lib/format";
import { excerpt } from "@/lib/markdown/render";
import { urls } from "@/lib/forum/urls";
import { siteConfig } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/community/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) return {};
  return { title: `${displayName(profile)} (@${profile.username})`, robots: { index: false, follow: true } };
}

/* Profiles are noindexed per the brief. */
export default async function ProfilePage({ params }: PageProps<"/community/u/[username]">) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const [activity, viewer] = await Promise.all([getProfileActivity(profile.id), getCurrentUser()]);
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
            {marketplaces.map((m) => (
              <Badge key={m.id} variant="outline">
                {m.label}
              </Badge>
            ))}
          </div>
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

      {profile.trust_level >= 2 && !profile.is_staff ? (
        <aside className="mt-4 rounded-lg bg-brand-soft p-4 text-sm">
          [TOM: soft mentoring banner for established members]{" "}
          <Link href="/mentoring" className="font-medium text-brand underline underline-offset-2 hover:text-brand-deep">
            About mentoring
          </Link>
        </aside>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Topics</h2>
        <TopicList topics={activity.topics} emptyMessage="[TOM: no topics yet on profile]" />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Recent replies</h2>
        {activity.replies.length === 0 ? (
          <p className="text-sm text-muted-foreground">[TOM: no replies yet on profile]</p>
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
