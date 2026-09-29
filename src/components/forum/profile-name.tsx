import Link from "next/link";
import { ProfileHoverCard } from "@/components/forum/profile-hover-card";
import { displayName } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import type { ProfileSummary } from "@/lib/db/types";

/* A member's name linking to their profile, with the profile card on hover or focus. */
export function ProfileName({ profile, className, children }: { profile: Pick<ProfileSummary, "username" | "display_name">; className?: string; children?: React.ReactNode }) {
  return (
    <ProfileHoverCard username={profile.username} trigger="name">
      <Link href={urls.profile(profile.username)} className={className}>
        {children ?? displayName(profile)}
      </Link>
    </ProfileHoverCard>
  );
}
