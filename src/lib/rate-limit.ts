import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/*
  Server-side rate limits. check_rate_limit is not callable by members (it
  would let anyone read or exhaust other people's counters), so it runs
  with the service role and the key is always built here, never from input.
  Returns true when the action is allowed.
*/
export async function allowAction(key: string, limit: number, window: string): Promise<boolean> {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    // No service key: allow in development, refuse in production.
    return process.env.NODE_ENV !== "production";
  }
  const { data, error } = await admin.rpc("check_rate_limit", { p_key: key, p_limit: limit, p_window: window });
  if (error) return process.env.NODE_ENV !== "production";
  return data !== false;
}

/* The caller's IP as Vercel reports it. Vercel sets x-real-ip itself, so it cannot be spoofed there. */
export function clientIp(h: Headers): string {
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",").pop()?.trim() ?? "unknown";
}
