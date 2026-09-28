import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteConfig } from "@/lib/site";

/*
  One-click unsubscribe. GET is the link in the email footer; POST is what
  mail apps send for the List-Unsubscribe-Post header (RFC 8058). The address
  stays on file as unsubscribed so we never email it again.
*/
async function unsubscribe(token: string | null): Promise<boolean> {
  if (!token || !/^[A-Za-z0-9_-]{20,64}$/.test(token)) return false;
  try {
    const { data } = await createAdminClient()
      .from("email_subscribers")
      .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
      .eq("confirm_token", token)
      .select("id");
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const ok = await unsubscribe(new URL(request.url).searchParams.get("token"));
  const title = ok ? "You have been unsubscribed" : "That link did not work";
  const body = ok ? "You will not get the newsletter again." : "You may already be unsubscribed.";
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;text-align:center"><h1>${title}</h1><p>${body}</p><p><a href="${siteConfig.url}">Back to The Sellers Network</a></p></body></html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function POST(request: Request) {
  await unsubscribe(new URL(request.url).searchParams.get("token"));
  return new NextResponse(null, { status: 204 });
}
