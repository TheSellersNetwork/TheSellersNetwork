import type { Metadata } from "next";
import { SalesReportTool } from "@/components/tools/sales-report-tool";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Profit and loss from your sales reports",
  description: "Upload your eBay, Amazon, Etsy, Depop, TikTok Shop or Whatnot sales report and see sales, fees and profit by month and UK tax year. Free, and nothing leaves your browser.",
  alternates: { canonical: "/tools/profit-report" },
};

const how = [
  ["eBay", "Seller Hub, then Payments, then Reports: download the transaction report."],
  ["Amazon", "Seller Central, then Payments, then Reports Repository: a date range transaction report."],
  ["Etsy", "Shop Manager, then Settings, then Options, then Download Data: orders or sales CSV."],
  ["Depop", "Your sales download, from the app or website."],
  ["TikTok Shop", "Finance, then Statements, then Export."],
  ["Whatnot", "Your show report or order history CSV."],
  ["Vinted", "Vinted has no sales spreadsheet. Log Vinted sales in our free stock tracker spreadsheet instead."],
];

export default function ProfitReportPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader
        title="Profit and loss from your sales reports"
        intro="Drop in the sales reports you download from your selling accounts and see sales, fees and what you actually took home, by month, by UK tax year and by calendar year. It works on any CSV with dates and amounts, and it all happens in your browser."
      />
      <SalesReportTool />
      <section className="mt-12">
        <h2 className="text-lg font-semibold">Where to find your report</h2>
        <p className="mt-1 text-sm text-muted-foreground">Menu names change from time to time; if one has moved, search the platform&rsquo;s help for &ldquo;download sales report&rdquo;.</p>
        <dl className="mt-3 divide-y rounded-xl border text-sm">
          {how.map(([k, v]) => (
            <div key={k} className="grid gap-1 p-3 sm:grid-cols-[140px_1fr]">
              <dt className="font-medium">{k}</dt>
              <dd className="text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
