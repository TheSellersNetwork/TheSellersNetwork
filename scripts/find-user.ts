import type { SupabaseClient } from "@supabase/supabase-js";

/* Finds an auth user by email, page by page, so scripts keep working past the first 1,000 members. */
export async function findUserByEmail(supabase: SupabaseClient, email: string) {
  const wanted = email.toLowerCase();
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) return null;
    const hit = data.users.find((u) => u.email?.toLowerCase() === wanted);
    if (hit) return hit;
    if (data.users.length < 1000) return null;
  }
  return null;
}
