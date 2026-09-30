import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/*
  Server client for Server Components, Route Handlers and Server Actions.
  Still the anon key: RLS does the access control. Use createAdminClient only in
  trusted server code such as cron jobs and webhooks.
*/
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    // Pages wait for these reads. Supabase retries a failed read three times
    // (1s, 2s, 4s), so a page with a few reads took half a minute when the
    // database could not be reached. Fail fast and let the page show its
    // empty states; the browser client and cron jobs keep the retries.
    db: { retry: false, timeout: 10_000 },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes sessions, so this is safe to ignore.
        }
      },
    },
  });
}
