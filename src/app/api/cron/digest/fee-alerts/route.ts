import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/email/cron-auth";
import { runFeeAlerts } from "@/lib/email/fee-alerts-run";

/*
  Fee change alerts. Runs daily from vercel.json, protected by CRON_SECRET.
  The first run records every existing change and sends nothing; later runs
  email opted-in members once per new change.
*/
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!cronAuthorised(request)) return NextResponse.json({ message: "Unauthorised" }, { status: 401 });
  try {
    return NextResponse.json(await runFeeAlerts());
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Fee alerts failed" }, { status: 500 });
  }
}
