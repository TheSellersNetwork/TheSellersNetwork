import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchMembers } from "@/lib/forum/queries";

/* Mention autocomplete. Signed-in members only, to keep the member list private from scrapers. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json([], { status: 401 });
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const members = await searchMembers(q);
  return NextResponse.json(members.map((m) => ({ username: m.username, display_name: m.display_name })));
}
