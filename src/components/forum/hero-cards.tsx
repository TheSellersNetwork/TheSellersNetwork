import Link from "next/link";
import { CheckCircle2, MessagesSquare, TrendingUp } from "lucide-react";
import { UserAvatar } from "@/components/forum/user-avatar";
import { getHeroTopics } from "@/lib/forum/live-queries";
import { displayName, plural } from "@/lib/format";
import { urls } from "@/lib/forum/urls";

/*
  Three cards above the list: the best solved answer this week, the busiest
  thread, and the weekly numbers thread. Shows the community at its best
  rather than its newest.
*/
export async function HeroCards() {
  const { solved, discussed, weekly } = await getHeroTopics();
  if (!solved && !discussed && !weekly) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {solved ? (
        <Card icon={<CheckCircle2 className="size-4 text-success" />} label="Solved this week" href={urls.topic(solved)} title={solved.title}>
          {solved.solver ? (
            <span className="flex items-center gap-2">
              <UserAvatar profile={solved.solver} size="xs" link={false} />
              answered by {displayName(solved.solver)}
            </span>
          ) : null}
        </Card>
      ) : null}
      {discussed ? (
        <Card icon={<MessagesSquare className="size-4 text-brand" />} label="Most discussed" href={urls.topic(discussed)} title={discussed.title}>
          {plural(discussed.reply_count, "reply", "replies")} in {discussed.category?.name ?? "the community"}
        </Card>
      ) : null}
      {weekly ? (
        <Card icon={<TrendingUp className="size-4 text-brand" />} label="This week's numbers" href={urls.topic(weekly)} title={weekly.title}>
          {weekly.reply_count === 0 ? "Be the first to post your week" : `${plural(weekly.reply_count, "member has", "members have")} posted their week`}
        </Card>
      ) : null}
    </div>
  );
}

function Card({ icon, label, href, title, children }: { icon: React.ReactNode; label: string; href: string; title: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="forum-card row-enter group flex flex-col gap-2 rounded-lg border bg-card p-4 transition-colors hover:border-brand/60">
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="line-clamp-2 font-semibold leading-snug group-hover:underline">{title}</span>
      <span className="mt-auto text-xs text-muted-foreground">{children}</span>
    </Link>
  );
}
