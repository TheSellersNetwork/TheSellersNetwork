import { shareImage } from "@/lib/og/card";
import { toolGroups } from "@/lib/tools/catalogue";

/* Share card for a tool page, from its entry in the tools catalogue. */
export function toolImage(href: string) {
  const tool = toolGroups.flatMap((g) => g.tools).find((t) => t.href === href);
  return shareImage({ label: "Free tool", title: tool?.title ?? "Free tools for UK resellers", subtitle: tool?.description ?? null, meta: ["No sign-up"] });
}
