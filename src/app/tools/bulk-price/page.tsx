import type { Metadata } from "next";
import { BulkPrice } from "@/components/tools/small-tools";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Bulk price change",
  description: "Change prices across a listings file by a percentage or a fixed amount, with .99 rounding and a price floor, then download it to upload back. Free, nothing leaves your browser.",
  alternates: { canonical: "/tools/bulk-price" },
};

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Bulk price change" intro="Download your listings file from your selling account, choose how to change the prices, check the preview, and download a new file to upload back. Your file never leaves your browser." />
      <BulkPrice />
    </main>
  );
}
