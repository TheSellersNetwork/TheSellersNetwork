import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getStreak } from "@/lib/forum/extras-queries";
import { isFoundingMember, trustLabel } from "@/lib/format";
import { siteConfig } from "@/lib/site";
import { getProfileBadges } from "@/lib/badges-queries";
import { badgeById } from "@/lib/badges";

/*
  Data for the profile hover card. Public profile fields only: nothing from
  settings, email preferences or moderation. The shared anonymous and deleted
  accounts get no card, so an anonymous post can never lead back to anyone.
*/
export type ProfileCardData =
  | {
      kind: "member";
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      label: string;
      isStaff: boolean;
      founding: boolean;
      platforms: string[];
      solutions: number;
      streak: number;
      /* Earned badges other than Founding and Team, which the card already shows. */
      badges: string[];
      joined: string;
    }
  | { kind: "hidden" };

const USERNAME_RE = /^[a-z0-9_]{1,40}$/;

const getSiteAccountKeys = cache(async (): Promise<Map<string, string>> => {
  const supabase = await createClient();
  const { data } = await supabase.from("site_accounts").select("key, profile_id");
  return new Map((data ?? []).map((r) => [r.profile_id as string, r.key as string]));
});

export async function getProfileCardData(rawUsername: string): Promise<ProfileCardData | null> {
  const username = rawUsername.toLowerCase();
  if (!USERNAME_RE.test(username)) return null;
  const supabase = await createClient();
  const [{ data: profile }, siteAccounts] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, trust_level, is_staff, solution_count, marketplaces, created_at")
      .eq("username", username)
      .maybeSingle(),
    getSiteAccountKeys(),
  ]);
  if (!profile) return null;
  const siteKey = siteAccounts.get(profile.id as string);
  if (siteKey === "anonymous" || siteKey === "deleted") return { kind: "hidden" };

  const [streak, badgeIds] = await Promise.all([getStreak(profile.id as string), getProfileBadges(profile.id as string).catch(() => [])]);
  const marketplaces = (profile.marketplaces ?? []) as string[];

  return {
    kind: "member",
    username: profile.username as string,
    displayName: (profile.display_name as string | null)?.trim() || null,
    avatarUrl: (profile.avatar_url as string | null) ?? null,
    label: trustLabel(profile.trust_level as number, profile.is_staff as boolean),
    isStaff: profile.is_staff as boolean,
    founding: isFoundingMember({ created_at: profile.created_at as string, is_staff: profile.is_staff as boolean }, siteConfig.foundingUntil),
    platforms: siteConfig.marketplaces.filter((m) => marketplaces.includes(m.id)).map((m) => m.label),
    solutions: Number(profile.solution_count ?? 0),
    streak,
    badges: badgeIds.filter((id) => id !== "founding" && id !== "team").map((id) => badgeById.get(id)?.name ?? id),
    joined: profile.created_at as string,
  };
}
