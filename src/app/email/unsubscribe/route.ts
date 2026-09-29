import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailTokenSecret, verifyUnsubscribeToken, type EmailKind } from "@/lib/email/tokens";
import { siteConfig } from "@/lib/site";

/*
  One-click unsubscribe for member emails: the weekly digest and fee change
  alerts. The token is signed (src/lib/email/tokens.ts), so it works without
  signing in and only for the member and email it was made for.

  Opening the link (GET) only shows a button, because email scanners open
  every link. The button and mail apps' one-click unsubscribe (RFC 8058,
  List-Unsubscribe-Post) both POST here. The database stamps the time of the
  change as the record.
*/

const names: Record<EmailKind, { title: string; done: string }> = {
  digest: { title: "the weekly digest", done: "You will not get the weekly digest again unless you switch it back on in your account." },
  fees: { title: "fee change alerts", done: "You will not get fee change alerts again unless you switch them back on in your account." },
};

async function unsubscribe(userId: string, kind: EmailKind): Promise<boolean> {
  try {
    const update = kind === "digest" ? { weekly_digest: false } : { fee_alerts: false };
    const { error } = await createAdminClient().from("member_email_prefs").update(update).eq("user_id", userId);
    return !error;
  } catch {
    return false;
  }
}

function escape(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escape(title)}</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;text-align:center"><h1 style="font-size:1.5rem">${escape(title)}</h1>${body}<p><a href="${siteConfig.url}/account#email-preferences">Email settings</a> &middot; <a href="${siteConfig.url}">Back to ${escape(siteConfig.name)}</a></p></body></html>`;
  return new NextResponse(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

const broken = () => page("That link did not work", "<p>It may be incomplete. You can switch emails off in your account settings instead.</p>", 400);

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const parsed = verifyUnsubscribeToken(emailTokenSecret(), token);
  if (!parsed || !token) return broken();
  // The token passed signature checks and is made of URL-safe characters only, so it is safe in the form.
  return page(
    `Unsubscribe from ${names[parsed.kind].title}`,
    `<form method="post" action="/email/unsubscribe?token=${encodeURIComponent(token)}"><button type="submit" style="font:inherit;padding:.6rem 1.2rem;min-height:44px;border-radius:.5rem;border:1px solid currentColor;cursor:pointer">Unsubscribe me</button></form>`,
  );
}

export async function POST(request: Request) {
  const parsed = verifyUnsubscribeToken(emailTokenSecret(), new URL(request.url).searchParams.get("token"));
  const ok = parsed ? await unsubscribe(parsed.userId, parsed.kind) : false;
  // Mail apps doing one-click unsubscribe do not want a page back.
  if (!(request.headers.get("accept") ?? "").includes("text/html")) return new NextResponse(null, { status: ok ? 204 : 400 });
  if (!parsed || !ok) return broken();
  return page("You have been unsubscribed", `<p>${escape(names[parsed.kind].done)}</p>`);
}
