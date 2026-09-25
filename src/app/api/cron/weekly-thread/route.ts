import { NextResponse } from "next/server";

/* Kept for older schedules. The rituals route posts Monday numbers and the rest. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  url.pathname = "/api/cron/rituals";
  url.searchParams.set("force", "numbers");
  return NextResponse.redirect(url, 307);
}
