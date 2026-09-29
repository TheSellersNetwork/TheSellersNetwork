import type { Metadata } from "next";
import Link from "next/link";
import { AmazonSettlement } from "@/components/tools/amazon-settlement";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Amazon settlement summariser",
  description:
    "Turn an Amazon settlement report into a clear summary of sales, refunds, fees, advertising, reimbursements and reserves, with CSVs for your bookkeeping. Free, and nothing leaves your browser.",
  alternates: { canonical: "/tools/amazon-settlement" },
};

const columns = [
  ["settlement-id", "Groups lines into settlements."],
  [
    "settlement-start-date, settlement-end-date, deposit-date",
    "The period and the day Amazon paid you.",
  ],
  ["total-amount, currency", "The settlement total we check the lines against."],
  [
    "transaction-type, amount-type, amount-description",
    "What each line is, used to put it in a group.",
  ],
  ["amount", "The money on each line."],
];

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader
        title="Amazon settlement summariser"
        intro="Upload an Amazon settlement report and see what made up the payout: sales, shipping, refunds, fees, advertising, reimbursements and reserves. It checks the lines add up to the total and gives you CSVs to take into your books. It all happens in your browser."
      />
      <AmazonSettlement />

      <section className="mt-12 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">Before you rely on it</h2>
        <p>
          This is a helper for your bookkeeping, not accounting or tax advice. The groups are our
          best reading of Amazon&rsquo;s line descriptions, which change from time to time, so check
          the breakdown under each settlement and anything that lands in Other. If you are VAT
          registered, ask your accountant how they want Amazon fees, VAT and reserves posted.
        </p>
        <p>
          If your file has no separate VAT lines for fees, the fee figures are as Amazon charged
          them and the VAT split is on the seller fee invoices in Seller Central.
        </p>
        <p>
          Paid services such as Link My Books and A2X read settlements automatically and post them
          to accounting software. This tool is a free, manual alternative: you download and upload
          each settlement yourself. For sales, fees and profit by month and tax year across platforms, use{" "}
          <Link href="/tools/profit-report" className="underline">
            profit and loss from your sales reports
          </Link>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">How to get your file</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          In Seller Central, go to Payments, then All statements (or Reports repository), and
          download the Flat File V2 for a settlement. It is a .txt file separated by tabs; upload it
          as it is. Menu names change from time to time; if one has moved, search Seller Central
          help for &ldquo;settlement report flat file V2&rdquo;.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Columns we read</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Names as Amazon documents them for the flat file V2 settlement report. We match them
          without worrying about capitals, spaces or dashes.
        </p>
        <dl className="mt-3 divide-y rounded-xl border text-sm">
          {columns.map(([k, v]) => (
            <div key={k} className="grid gap-1 p-3 sm:grid-cols-[260px_1fr]">
              <dt className="font-mono text-xs">{k}</dt>
              <dd className="text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
