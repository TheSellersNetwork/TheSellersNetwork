import type { Metadata } from "next";
import { EmbedCalculator } from "@/components/tools/calculator/embed-calculator";
import { readEmbedPlatform, readTheme } from "@/components/tools/calculator/model";

/*
  The embeddable fee calculator: /embed/calculator?platform=ebay&theme=dark.
  Made for other sites' iframes, so the root layout leaves out the header,
  footer, analytics and cookie banner (see src/proxy.ts), and next.config.ts
  lets any site frame /embed/* only. Without ?platform= the visitor picks one.
*/

export const metadata: Metadata = {
  title: "Fee calculator",
  robots: { index: false, follow: true },
};

export default async function EmbedCalculatorPage({ searchParams }: PageProps<"/embed/calculator">) {
  const sp = await searchParams;
  const chosen = readEmbedPlatform(sp.platform);
  const theme = readTheme(sp.theme);
  return (
    <main id="main" data-theme={theme} className="min-h-screen bg-background p-3 text-foreground">
      <EmbedCalculator initialSlug={chosen?.slug ?? "ebay"} fixed={chosen !== null} />
    </main>
  );
}
