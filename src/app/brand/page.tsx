import type { Metadata } from "next";
import { BrandPreview } from "@/components/brand/brand-preview";
import { currentStyle } from "@/lib/style-server";

export const metadata: Metadata = {
  title: "Brand options",
  robots: { index: false, follow: false },
};

/*
  Internal page for choosing the palette and logo. Not linked from the site
  and noindexed. Remove or gate behind staff once Tom has picked.
*/
export default async function BrandPage() {
  return <BrandPreview initialStyle={await currentStyle()} />;
}
