import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/*
  Service-role client. Bypasses RLS, so it is only for cron jobs, webhooks and
  the seed script. The "server-only" import makes the build fail if this file is
  ever pulled into a client bundle.
*/
export function createAdminClient() {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
