import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { displayName, initials } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import type { ProfileSummary } from "@/lib/db/types";
import { cn } from "@/lib/utils";

type Props = {
  profile: Pick<ProfileSummary, "username" | "display_name" | "avatar_url"> | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  link?: boolean;
  className?: string;
};

const sizes = {
  xs: "size-5 text-[10px]",
  sm: "size-7 text-xs",
  md: "size-9 text-sm",
  lg: "size-12 text-base",
  xl: "size-20 text-2xl",
};

/* Initials on a neutral background until an avatar is uploaded. */
export function UserAvatar({ profile, size = "md", link = true, className }: Props) {
  const avatar = (
    <Avatar className={cn(sizes[size], className)}>
      {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
      <AvatarFallback className="bg-secondary font-medium text-secondary-foreground">
        {initials(profile)}
      </AvatarFallback>
    </Avatar>
  );
  if (!link || !profile) return avatar;
  return (
    <Link href={urls.profile(profile.username)} aria-label={displayName(profile)} className="shrink-0 rounded-full">
      {avatar}
    </Link>
  );
}
