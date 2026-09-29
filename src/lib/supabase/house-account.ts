import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { findUserIdByEmail } from "@/lib/supabase/find-user";

/*
  Who automatic threads are posted as: the house account ("The Sellers
  Network", labelled Team) once the seed has created it, otherwise the
  SEED_AUTHOR_EMAIL account as before.
*/
export async function postingAuthorId(admin: SupabaseClient): Promise<string | null> {
  const { data } = await admin.from("site_accounts").select("profile_id").eq("key", "house").maybeSingle();
  if (data?.profile_id) return data.profile_id as string;
  const email = process.env.SEED_AUTHOR_EMAIL;
  return email ? findUserIdByEmail(admin, email) : null;
}
