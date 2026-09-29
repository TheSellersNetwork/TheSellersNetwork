import { UserAvatar } from "@/components/forum/user-avatar";
import { ProfileName } from "@/components/forum/profile-name";
import { getOnlineMembers } from "@/lib/forum/live-queries";

/* Right rail: who is here right now, the way a Discord member list shows it. */
export async function OnlineMembers() {
  const members = await getOnlineMembers(12);
  if (members.length === 0) return null;
  return (
    <div className="forum-card rail-card rounded-lg border bg-card p-4 text-sm">
      <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span className="live-dot size-2 rounded-full bg-success" aria-hidden="true" />
        Online now <span className="normal-case tracking-normal">{members.length}</span>
      </h2>
      <ul className="mt-2 space-y-1.5">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-2">
            <UserAvatar profile={m} size="sm" online />
            <span className="min-w-0 flex-1 truncate">
              <ProfileName profile={m} className="hover:underline" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
