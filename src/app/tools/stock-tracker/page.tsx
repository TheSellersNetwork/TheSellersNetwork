import type { Metadata } from "next";
import Link from "next/link";
import { StockTracker } from "@/components/tools/stock-tracker";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Stock tracker for resellers",
  description:
    "A free stock list for UK resellers: SKU, source, cost, where it is listed, status and profit, with totals for the month and tax year and how long each item has been held. Saved only in your browser, with CSV and JSON export.",
  alternates: { canonical: "/tools/stock-tracker" },
};

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader
        title="Stock tracker"
        intro="Every item you own for sale in one list: what it cost, where it came from, where it is listed and what it made. See your stock value, this month's profit and what has been sitting too long. Private to this device."
      />
      <StockTracker />
      <section className="mt-14 space-y-2 border-t pt-8 text-sm text-muted-foreground">
        <h2 className="font-semibold text-foreground">Prefer a spreadsheet?</h2>
        <p>
          The{" "}
          <Link href="/tools/downloads" className="underline">
            free stock tracker spreadsheet
          </Link>{" "}
          has the same columns, so you can move between the two with the CSV export and import. Setting up stock numbers and storage:{" "}
          <Link href="/guides/storage-and-stock-numbers" className="underline">
            storage and stock numbers
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
