import Link from "next/link";
import { UserAvatar } from "@/components/forum/user-avatar";
import { getRecentMembers } from "@/lib/forum/home-queries";
import { isOnline } from "@/lib/forum/live-queries";
import { displayName } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import { siteConfig } from "@/lib/site";

const short: Record<string, string> = {
  ebay: "eBay",
  amazon: "Amazon",
  vinted: "Vinted",
  etsy: "Etsy",
  depop: "Depop",
  facebook: "Facebook",
  own_website: "Own site",
  live: "Live",
  other: "Other",
};

/*
  A Discord-style row of members, each with a green dot if they are here now
  and tiny labels for where they sell. Shows the last week's active members
  so it reads as a community rather than a headcount, and stays hidden until
  there are at least three so it never looks thin.
*/
export async function MembersStrip() {
  const members = await getRecentMembers(12);
  if (members.length < 3) return null;
  const onlineCount = members.filter((m) => isOnline(m.last_seen_at)).length;

  return (
    <section aria-label="Members" className="forum-card rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Who is around</h2>
        <p className="text-xs text-muted-foreground">
          {onlineCount > 0 ? `${onlineCount} here now · ` : ""}
          {members.length} active this week
        </p>
      </div>
      <ul className="mt-4 flex flex-wrap gap-4">
        {members.map((m) => (
          <li key={m.id} className="flex w-[4.5rem] flex-col items-center text-center">
            <UserAvatar profile={m} size="lg" online={isOnline(m.last_seen_at)} />
            <Link href={urls.profile(m.username)} className="mt-1.5 w-full truncate text-xs font-medium hover:underline">
              {displayName(m)}
            </Link>
            <span className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
              {m.marketplaces
                .slice(0, 2)
                .map((id) => short[id] ?? siteConfig.marketplaces.find((x) => x.id === id)?.label ?? id)
                .join(" · ")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
