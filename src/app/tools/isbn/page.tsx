import type { Metadata } from "next";
import { IsbnLookup } from "@/components/tools/small-tools";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "ISBN checker and book lookup",
  description: "Check an ISBN is valid and look up the book's title, author and edition. Free.",
  alternates: { canonical: "/tools/isbn" },
};

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="ISBN checker and book lookup" intro="Type or paste an ISBN to check it is valid and see the title, author and edition, so your listing matches the right book. Selling books on Amazon? See our used books guide." />
      <IsbnLookup />
    </main>
  );
}
