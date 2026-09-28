import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteConfig } from "@/lib/site";

/*
  Unsubscribe. Opening the link (GET) only shows a button, because email
  scanners open every link and would otherwise unsubscribe people. The
  button, and mail apps' one-click unsubscribe (RFC 8058, List-Unsubscribe-Post),
  both POST here. The address stays on file as unsubscribed so we never email it again.
*/
const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

async function unsubscribe(token: string | null): Promise<boolean> {
  if (!token || !TOKEN.test(token)) return false;
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

function page(title: string, body: string) {
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;text-align:center"><h1>${title}</h1>${body}<p><a href="${siteConfig.url}">Back to The Sellers Network</a></p></body></html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token || !TOKEN.test(token)) return page("That link did not work", "<p>You may already be unsubscribed.</p>");
  // The token matches a strict pattern, so it is safe to place in the form.
  return page(
    "Unsubscribe from the newsletter",
    `<form method="post" action="/newsletter/unsubscribe?token=${token}"><button type="submit" style="font:inherit;padding:.6rem 1.2rem;border-radius:.5rem;border:1px solid currentColor;cursor:pointer">Unsubscribe me</button></form>`,
  );
}

export async function POST(request: Request) {
  const ok = await unsubscribe(new URL(request.url).searchParams.get("token"));
  // Mail apps doing one-click unsubscribe do not want a page back.
  if (!(request.headers.get("accept") ?? "").includes("text/html")) return new NextResponse(null, { status: ok ? 204 : 400 });
  return ok ? page("You have been unsubscribed", "<p>You will not get the newsletter again.</p>") : page("That link did not work", "<p>You may already be unsubscribed.</p>");
}
