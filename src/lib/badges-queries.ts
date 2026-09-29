import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/site";
import { activitySince, type ActivityEvent } from "@/lib/badges-activity";
import { HELPER_SOLUTIONS, countActivityHolders, earnedBadges, longestWeeklyStreak, pickupFacts, weekStartUTC, type BadgeId } from "@/lib/badges";

/*
  Badge queries. Everything is cached per request with React cache, so a page
  that shows the same member's badges twice asks the database once.
*/

/* Title of the weekly numbers thread, as matched by the numbers_streak database function. */
const NUMBERS_TITLE = "What did you sell this week%";
/* Upper bound on rows read for the holder counts. Plenty for a young forum; revisit with an RPC if it ever gets close. */
const MAX_ROWS = 10_000;

/* The shared site accounts (anonymous, deleted, house). They are not members, so they never hold or count towards badges. */
export const getSiteAccountIds = cache(async (): Promise<Set<string>> => {
  const supabase = await createClient();
  const { data } = await supabase.from("site_accounts").select("profile_id");
  return new Set((data ?? []).map((r) => r.profile_id as string).filter(Boolean));
});

type NumbersRow = { author_id: string; created_at: string };

async function numbersPosts(authorId?: string): Promise<NumbersRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("posts")
    .select("author_id, created_at, topic:topics!inner (title)")
    .ilike("topic.title", NUMBERS_TITLE)
    .gt("post_number", 1)
    .eq("is_deleted", false)
    .limit(MAX_ROWS);
  if (authorId) q = q.eq("author_id", authorId);
  const { data } = await q;
  return (data ?? []).map((r) => ({ author_id: r.author_id as string, created_at: r.created_at as string }));
}

/* Badges one member has earned, in display order. Empty for site accounts and unknown ids. */
export const getProfileBadges = cache(async (profileId: string): Promise<BadgeId[]> => {
  if (!/^[0-9a-f-]{36}$/.test(profileId)) return [];
  const supabase = await createClient();
  const [siteIds, { data: profile }, { data: pickups }, posts] = await Promise.all([
    getSiteAccountIds(),
    supabase.from("profiles").select("created_at, is_staff, solution_count").eq("id", profileId).maybeSingle(),
    supabase.from("pickups").select("paid, sold_price").eq("user_id", profileId).eq("is_hidden", false).limit(MAX_ROWS),
    numbersPosts(profileId),
  ]);
  if (!profile || siteIds.has(profileId)) return [];
  return earnedBadges(
    {
      createdAt: profile.created_at as string,
      isStaff: !!profile.is_staff,
      solutionCount: Number(profile.solution_count ?? 0),
      longestStreak: longestWeeklyStreak(posts.map((p) => weekStartUTC(p.created_at))),
      ...pickupFacts((pickups ?? []) as { paid: number; sold_price: number | null }[]),
    },
    siteConfig.foundingUntil,
  );
});

/* How many members hold each badge. */
export const getBadgeHolderCounts = cache(async (): Promise<Record<BadgeId, number>> => {
  const supabase = await createClient();
  const siteIds = await getSiteAccountIds();
  const notSite = siteIds.size > 0 ? `(${[...siteIds].join(",")})` : null;
  const count = (build: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => build(base()).then((r) => r.count ?? 0);
  function base() {
    const q = supabase.from("profiles").select("id", { count: "exact", head: true });
    return notSite ? q.not("id", "in", notSite) : q;
  }
  const [founding, firstSolution, helper, team, { data: pickups }, posts] = await Promise.all([
    count((q) => q.eq("is_staff", false).lte("created_at", `${siteConfig.foundingUntil}T23:59:59.999Z`)),
    count((q) => q.gte("solution_count", 1)),
    count((q) => q.gte("solution_count", HELPER_SOLUTIONS)),
    count((q) => q.eq("is_staff", true)),
    supabase.from("pickups").select("user_id, paid, sold_price").eq("is_hidden", false).limit(MAX_ROWS),
    numbersPosts(),
  ]);
  const activity = countActivityHolders((pickups ?? []) as { user_id: string; paid: number; sold_price: number | null }[], posts, siteIds);
  return { founding, "first-solution": firstSolution, helper, team, ...activity };
});

/* Topics, replies and pickups by one member since the start of the activity grid. Deleted and hidden rows are left out. */
export const getActivityEvents = cache(async (userId: string, weeks = 52): Promise<ActivityEvent[]> => {
  const since = activitySince(new Date(), weeks);
  const supabase = await createClient();
  const [{ data: topics }, { data: posts }, { data: pickups }] = await Promise.all([
    supabase.from("topics").select("created_at").eq("author_id", userId).is("deleted_at", null).gte("created_at", since).limit(MAX_ROWS),
    supabase.from("posts").select("created_at").eq("author_id", userId).eq("is_deleted", false).gt("post_number", 1).gte("created_at", since).limit(MAX_ROWS),
    supabase.from("pickups").select("created_at").eq("user_id", userId).eq("is_hidden", false).gte("created_at", since).limit(MAX_ROWS),
  ]);
  return [
    ...(topics ?? []).map((r) => ({ at: r.created_at as string, kind: "topic" as const })),
    ...(posts ?? []).map((r) => ({ at: r.created_at as string, kind: "post" as const })),
    ...(pickups ?? []).map((r) => ({ at: r.created_at as string, kind: "pickup" as const })),
  ];
});
