import type { Metadata } from "next";
import Link from "next/link";
import { AmazonSettlement } from "@/components/tools/amazon-settlement";
import { SalesReportTool } from "@/components/tools/sales-report-tool";
import { ToolHeader, ToolIntro } from "@/components/tools/tool-header";
import { ToolTabs } from "@/components/tools/tool-tabs";

export const metadata: Metadata = {
  title: "Sales reports and profit: profit and loss and Amazon settlements",
  description:
    "Upload your eBay, Amazon, Etsy, Depop, TikTok Shop or Whatnot sales report and see sales, fees and profit by month and UK tax year, or turn an Amazon settlement report into a clear summary for your bookkeeping. Free, and nothing leaves your browser.",
  alternates: { canonical: "/tools/sales-reports" },
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

const columns = [
  ["settlement-id", "Groups lines into settlements."],
  ["settlement-start-date, settlement-end-date, deposit-date", "The period and the day Amazon paid you."],
  ["total-amount, currency", "The settlement total we check the lines against."],
  ["transaction-type, amount-type, amount-description", "What each line is, used to put it in a group."],
  ["amount", "The money on each line."],
];

export default async function Page({ searchParams }: PageProps<"/tools/sales-reports">) {
  const { tab } = await searchParams;
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Sales reports and profit" intro="Drop in the reports you download from your selling accounts and see what you actually took home. Everything happens in your browser: your files are never uploaded." />
      <ToolTabs
        initial={typeof tab === "string" ? tab : undefined}
        label="Sales report tools"
        tabs={[
          {
            id: "profit",
            label: "Profit and loss from any platform",
            content: (
              <>
                <ToolIntro>
                  See sales, fees and what you actually took home, by month, by UK tax year and by calendar year. It works on any CSV with dates and amounts.
                </ToolIntro>
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
              </>
            ),
          },
          {
            id: "amazon-settlement",
            label: "Amazon settlement",
            content: (
              <>
                <ToolIntro>
                  Upload an Amazon settlement report and see what made up the payout: sales, shipping, refunds, fees, advertising, reimbursements and reserves. It checks the lines add up to the total and gives you CSVs to take into your books.
                </ToolIntro>
                <AmazonSettlement />

                <section className="mt-12 space-y-3 text-sm text-muted-foreground">
                  <h2 className="text-lg font-semibold text-foreground">Before you rely on it</h2>
                  <p>
                    This is a helper for your bookkeeping, not accounting or tax advice. The groups are our best reading of Amazon&rsquo;s line descriptions, which change from time to time, so check the breakdown under each settlement and anything that lands in Other. If you are VAT registered, ask your
                    accountant how they want Amazon fees, VAT and reserves posted.
                  </p>
                  <p>If your file has no separate VAT lines for fees, the fee figures are as Amazon charged them and the VAT split is on the seller fee invoices in Seller Central.</p>
                  <p>
                    Paid services such as Link My Books and A2X read settlements automatically and post them to accounting software. This tool is a free, manual alternative: you download and upload each settlement yourself. For sales, fees and profit by month and tax year across platforms, use{" "}
                    <Link href="/tools/sales-reports?tab=profit" className="underline">
                      profit and loss from any platform
                    </Link>
                    .
                  </p>
                </section>

                <section className="mt-10">
                  <h2 className="text-lg font-semibold">How to get your file</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    In Seller Central, go to Payments, then All statements (or Reports repository), and download the Flat File V2 for a settlement. It is a .txt file separated by tabs; upload it as it is. Menu names change from time to time; if one has moved, search Seller Central help for
                    &ldquo;settlement report flat file V2&rdquo;.
                  </p>
                </section>

                <section className="mt-10">
                  <h2 className="text-lg font-semibold">Columns we read</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Names as Amazon documents them for the flat file V2 settlement report. We match them without worrying about capitals, spaces or dashes.</p>
                  <dl className="mt-3 divide-y rounded-xl border text-sm">
                    {columns.map(([k, v]) => (
                      <div key={k} className="grid gap-1 p-3 sm:grid-cols-[260px_1fr]">
                        <dt className="font-mono text-xs">{k}</dt>
                        <dd className="text-muted-foreground">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </>
            ),
          },
        ]}
      />
    </main>
  );
}
