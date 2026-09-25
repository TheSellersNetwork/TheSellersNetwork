import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/* Browser client. Uses the anon key only; the service key never reaches the client. */
export function createClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
