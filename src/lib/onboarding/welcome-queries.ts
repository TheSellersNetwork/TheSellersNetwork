import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { urls } from "@/lib/forum/urls";
import { showWelcome, welcomeSteps, type WelcomeStep } from "@/lib/onboarding/welcome";

const INTRODUCTIONS = "introductions";

/*
  The signed-in member's welcome checklist, or null when it should not show
  (signed out, past the first 30 days, finished or dismissed). Cached per
  request so the home page and community page can both ask.
*/
export const getWelcomeChecklist = cache(async (): Promise<{ steps: WelcomeStep[] } | null> => {
  const user = await getCurrentUser();
  if (!user || !user.profile.onboarded_at) return null;
  const profile = user.profile as typeof user.profile & { welcome_dismissed_at?: string | null };
  // Cheap check first: past the window or dismissed means no queries at all.
  if (!showWelcome({ joinedAt: profile.created_at, dismissedAt: profile.welcome_dismissed_at ?? null, steps: [{ id: "profile", label: "", hint: "", href: "", done: false }] })) return null;

  try {
    const supabase = await createClient();
    const { data: intro } = await supabase.from("categories").select("id").eq("slug", INTRODUCTIONS).maybeSingle();
    const count = (r: { count: number | null }) => r.count ?? 0;
    const [introduced, pickups, answers, follows] = await Promise.all([
      intro
        ? supabase.from("topics").select("id", { count: "exact", head: true }).eq("author_id", user.id).eq("category_id", intro.id)
        : Promise.resolve({ count: 0 }),
      supabase.from("pickups").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      // A reply in a topic someone else started.
      supabase
        .from("posts")
        .select("id, topic:topics!inner (author_id)", { count: "exact", head: true })
        .eq("author_id", user.id)
        .gt("post_number", 1)
        .eq("is_deleted", false)
        .neq("topic.author_id", user.id),
      supabase.from("category_follows").select("category_id", { count: "exact", head: true }).eq("user_id", user.id).eq("level", "following"),
    ]);
    const steps = welcomeSteps(
      {
        hasAvatarOrBio: !!profile.avatar_url || !!profile.bio?.trim(),
        platformCount: (profile.marketplaces ?? []).length,
        introduced: count(introduced) > 0,
        pickups: count(pickups),
        answers: count(answers),
        follows: count(follows),
      },
      {
        account: urls.account(),
        introduce: urls.newTopic(intro ? INTRODUCTIONS : undefined),
        pickup: "/community/pickups/new",
        answer: `${urls.community()}?view=unanswered`,
        follow: urls.community(),
      },
    );
    return showWelcome({ joinedAt: profile.created_at, dismissedAt: null, steps }) ? { steps } : null;
  } catch {
    return null;
  }
});
