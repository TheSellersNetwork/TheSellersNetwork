import type { Metadata } from "next";
import { ToolHeader } from "@/components/tools/tool-header";
import { EmbedCode } from "@/components/tools/calculator/embed-code";
import { HUB } from "@/components/tools/calculator/views";

export const metadata: Metadata = {
  title: "Put the fee calculator on your site",
  description: "Free iframe code for a small UK fee calculator for eBay, Vinted, Depop, Etsy, Amazon, TikTok Shop, Whatnot or eBay Live. No cookies, no tracking.",
  alternates: { canonical: "/tools/calculator/embed" },
};

export default function EmbedCodePage() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader
        title="Put the fee calculator on your site"
        intro="A small fee calculator for your blog, shop or group page. Choose the platform, theme and size, then copy the code into your page. It sets no cookies, runs no analytics and needs no sign-in."
        parent={{ href: "/tools/calculator", label: HUB }}
      />
      <EmbedCode />
    </main>
  );
}
