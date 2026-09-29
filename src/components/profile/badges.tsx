import Link from "next/link";
import { CalendarCheck, CalendarRange, CircleCheck, Eye, HandHelping, Package, ShieldCheck, Sprout, Tag, type LucideIcon } from "lucide-react";
import { badgeById, type BadgeId } from "@/lib/badges";
import { getProfileBadges } from "@/lib/badges-queries";
import { cn } from "@/lib/utils";

export const badgeIcons: Record<BadgeId, LucideIcon> = {
  founding: Sprout,
  "first-solution": CircleCheck,
  helper: HandHelping,
  "streak-4": CalendarCheck,
  "streak-12": CalendarRange,
  "first-pickup": Package,
  "first-sold": Tag,
  "sharp-eye": Eye,
  team: ShieldCheck,
};

export function BadgeIcon({ id, className }: { id: BadgeId; className?: string }) {
  const Icon = badgeIcons[id];
  return (
    <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand", className)}>
      <Icon className="size-[55%]" aria-hidden="true" />
    </span>
  );
}

/* A member's earned badges as small chips, each linking to its explanation on the badges page. */
export function BadgeChips({ ids, className }: { ids: BadgeId[]; className?: string }) {
  if (ids.length === 0) return null;
  return (
    <ul aria-label="Badges" className={cn("flex flex-wrap gap-1.5", className)}>
      {ids.map((id) => {
        const b = badgeById.get(id)!;
        const Icon = badgeIcons[id];
        return (
          <li key={id}>
            <Link
              href={`/community/badges#${id}`}
              title={b.rule}
              className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs text-muted-foreground hover:border-brand/60 hover:text-foreground"
            >
              <Icon className="size-3 text-brand" aria-hidden="true" />
              {b.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/*
  Drop-in for anywhere a member is shown, for example next to a post author:
  <BadgeRow profileId={id} />. Server component; the lookup is cached per
  request, so a thread with the same author many times asks once.
*/
export async function BadgeRow({ profileId, className }: { profileId: string; className?: string }) {
  const ids = await getProfileBadges(profileId);
  return <BadgeChips ids={ids} className={className} />;
}

/* The badges section of a profile: each earned badge with how it was earned. */
export function ProfileBadges({ ids, own }: { ids: BadgeId[]; own: boolean }) {
  return (
    <section aria-labelledby="badges-heading" className="mt-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="badges-heading" className="text-lg font-semibold">
          Badges
        </h2>
        <Link href="/community/badges" className="text-sm text-brand underline-offset-2 hover:underline">
          How badges are earned
        </Link>
      </div>
      {ids.length === 0 ? (
        <p className="text-sm text-muted-foreground">{own ? "No badges yet. Share a pickup or answer a question to earn your first." : "No badges yet."}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {ids.map((id) => {
            const b = badgeById.get(id)!;
            return (
              <li key={id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <BadgeIcon id={id} />
                <div className="min-w-0">
                  <Link href={`/community/badges#${id}`} className="text-sm font-medium hover:underline">
                    {b.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{b.rule}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
