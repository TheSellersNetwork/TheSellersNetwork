import type { Metadata } from "next";
import { BrandPreview } from "@/components/brand/brand-preview";
import { currentStyle } from "@/lib/style-server";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Brand options",
  robots: { index: false, follow: false },
};

/* Staff-only page for comparing palettes, styles and logo marks. */
export default async function BrandPage() {
  await requireStaff();
  return <BrandPreview initialStyle={await currentStyle()} />;
}
