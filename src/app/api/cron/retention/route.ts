import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/*
  Daily clean-up so we keep personal data no longer than the privacy policy
  says: rate-limit rows (which hold IP addresses) after 30 days, newsletter
  sign-ups never confirmed after 30 days, closed contact messages and
  resolved flags after 3 years. Protected by CRON_SECRET.
*/
function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const a = Buffer.from(request.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export async function GET(request: Request) {
  if (!authorised(request)) return NextResponse.json({ message: "Unauthorised" }, { status: 401 });
  const admin = createAdminClient();
  const results = await Promise.all([
    admin.from("rate_limits").delete().lt("window_start", daysAgo(30)),
    admin.from("email_subscribers").delete().eq("status", "pending").lt("created_at", daysAgo(30)),
    admin.from("contact_messages").delete().eq("status", "closed").lt("created_at", daysAgo(3 * 365)),
    admin.from("flags").delete().neq("status", "open").lt("created_at", daysAgo(3 * 365)),
  ]);
  const failed = results.filter((r) => r.error).map((r) => r.error?.message);
  return NextResponse.json({ ok: failed.length === 0, failed });
}
