import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/* Finds an auth user by email, page by page, so it keeps working past the first 1,000 members. */
export async function findUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const wanted = email.toLowerCase();
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) return null;
    const hit = data.users.find((u) => u.email?.toLowerCase() === wanted);
    if (hit) return hit.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

/* Email addresses for a handful of users, fetched one by one. */
export async function emailsFor(admin: SupabaseClient, userIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data.user?.email) out.set(id, data.user.email);
    }),
  );
  return out;
}
