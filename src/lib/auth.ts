import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/db/types";

export type CurrentUser = {
  id: string;
  email: string | null;
  emailConfirmed: boolean;
  profile: Profile;
};

/*
  The signed-in member with their profile, or null. Cached per request so the
  header, rail and page can all call it without extra round trips.
*/
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!profile) return null;

    return {
      id: user.id,
      email: user.email ?? null,
      emailConfirmed: Boolean(user.email_confirmed_at),
      profile: profile as Profile,
    };
  } catch {
    // An unreachable database must not take the whole page down; treat as signed out.
    return null;
  }
});

/* Redirects to sign in, then back to `next` afterwards. */
export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }
  return user;
}

/* Signed in and finished onboarding. Sends unfinished members to onboarding. */
export async function requireOnboardedUser(next?: string): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (!user.profile.onboarded_at) {
    redirect(`/onboarding${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }
  return user;
}

export async function requireStaff(): Promise<CurrentUser> {
  const user = await requireUser("/admin/flags");
  if (!user.profile.is_staff) {
    redirect("/community");
  }
  return user;
}
