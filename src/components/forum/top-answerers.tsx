import Link from "next/link";
import { UserAvatar } from "@/components/forum/user-avatar";
import { getTopAnswerers } from "@/lib/forum/queries";
import { displayName } from "@/lib/format";
import { urls } from "@/lib/forum/urls";

/* Right rail card: the members with the most accepted answers this month. */
export async function TopAnswerers() {
  const answerers = await getTopAnswerers(30, 5);
  if (answerers.length === 0) return null;
  return (
    <div className="forum-card rail-card rounded-lg border bg-card p-4 text-sm">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top answerers this month</h2>
      <ol className="mt-2 space-y-2">
        {answerers.map((a) => (
          <li key={a.id} className="flex items-center gap-2">
            <UserAvatar profile={a} size="sm" />
            <Link href={urls.profile(a.username)} className="min-w-0 flex-1 truncate font-medium hover:underline">
              {displayName(a)}
            </Link>
            <span className="text-xs text-muted-foreground">
              {a.solutions} {a.solutions === 1 ? "solution" : "solutions"}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
