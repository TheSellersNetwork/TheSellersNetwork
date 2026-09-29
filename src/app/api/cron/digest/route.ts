import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/email/cron-auth";
import { runWeeklyDigest } from "@/lib/email/digest-run";

/*
  Weekly digest email. Scheduled for Monday 08:00 UTC in vercel.json, an hour
  after /api/cron/rituals posts the Monday numbers thread, so the digest can
  link to it. Protected by CRON_SECRET. Safe to rerun the same week.
*/
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!cronAuthorised(request)) return NextResponse.json({ message: "Unauthorised" }, { status: 401 });
  try {
    return NextResponse.json(await runWeeklyDigest());
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Digest failed" }, { status: 500 });
  }
}
