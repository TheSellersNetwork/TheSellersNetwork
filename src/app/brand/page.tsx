import type { Metadata } from "next";
import { BrandPreview } from "@/components/brand/brand-preview";

export const metadata: Metadata = {
  title: "Brand options",
  robots: { index: false, follow: false },
};

/*
  Internal page for choosing the palette and logo. Not linked from the site
  and noindexed. Remove or gate behind staff once Tom has picked.
*/
export default function BrandPage() {
  return <BrandPreview />;
}
