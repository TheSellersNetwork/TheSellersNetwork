import { NextResponse } from "next/server";
import { recordClick } from "@/app/actions/placements";
import { createClient } from "@/lib/supabase/server";
import { trackServer } from "@/lib/analytics/server";

/*
  Outbound redirect that counts the click.
    /go/<placement id>        a sponsor placement
    /go/partner/<slug>        a directory entry
  Unknown ids go to the partners page rather than 404ing.
*/
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const origin = new URL(request.url).origin;
  const referer = request.headers.get("referer") ?? "";
  const page = referer.startsWith(origin) ? referer.slice(origin.length) : "direct";
  const supabase = await createClient();

  if (path[0] === "partner" && path[1]) {
    const { data } = await supabase.from("partners").select("id, url, slug").eq("slug", path[1]).eq("is_active", true).maybeSingle();
    if (data) {
      await trackServer("partner_click", { partner: data.slug, page }, "anonymous");
      return NextResponse.redirect(data.url, 302);
    }
  } else if (path[0]) {
    const { data } = await supabase.rpc("live_placements", { p_slot: "rail", p_limit: 50 });
    const { data: rows } = await supabase.rpc("live_placements", { p_slot: "topic_list", p_limit: 50 });
    const all = [...((data ?? []) as { id: string; url: string | null; partner_id: string }[]), ...((rows ?? []) as { id: string; url: string | null; partner_id: string }[])];
    const placement = all.find((p) => p.id === path[0]);
    if (placement) {
      await recordClick(placement.id, page);
      let target = placement.url;
      if (!target) {
        const { data: partner } = await supabase.from("partners").select("url").eq("id", placement.partner_id).maybeSingle();
        target = partner?.url ?? null;
      }
      if (target) return NextResponse.redirect(target, 302);
    }
  }

  return NextResponse.redirect(new URL("/partners", origin), 302);
}
