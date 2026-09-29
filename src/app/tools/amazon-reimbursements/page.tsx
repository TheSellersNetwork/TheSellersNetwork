import type { Metadata } from "next";
import Link from "next/link";
import { AmazonReimbursements } from "@/components/tools/amazon-reimbursements";
import { ToolHeader } from "@/components/tools/tool-header";
import { CLAIM_SOURCES, CUSTOMER_RETURN_WINDOW, WAREHOUSE_CLAIM_DAYS } from "@/lib/tools/claims";
import { REASON_CODES } from "@/lib/tools/amazon-reports";

export const metadata: Metadata = {
  title: "Amazon FBA reimbursement checker",
  description:
    "Upload your Amazon inventory ledger, reimbursements and returns reports to find stock lost or damaged in the warehouse, and refunds where the item never came back, with the last day to claim. Free, and nothing leaves your browser.",
  alternates: { canonical: "/tools/amazon-reimbursements" },
};

const reports = [
  [
    "Inventory Ledger report, detailed view",
    "Reports, then Fulfilment, then Inventory Ledger. Choose Detailed view, a date range, then Download. Finds units marked lost or damaged.",
  ],
  [
    "Reimbursements report",
    "Reports, then Fulfilment, then Reimbursements. Shows what Amazon has already paid you for.",
  ],
  [
    "FBA customer returns report",
    "Reports, then Fulfilment, then Customer returns (under Customer concessions). Shows what came back.",
  ],
  [
    "Settlement or date range transaction report",
    "Payments, then All statements or Reports repository. Shows which orders were refunded.",
  ],
];

const code = (g: keyof typeof REASON_CODES) => REASON_CODES[g].codes.join(", ");

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader
        title="Amazon FBA reimbursement checker"
        intro="Upload the reports Amazon gives you and see stock that was lost or damaged in the warehouse without a reimbursement, and refunds where the item was never returned, with the last day to claim for each. It all happens in your browser."
      />
      <AmazonReimbursements />

      <section className="mt-12 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">What this can and cannot tell you</h2>
        <p>
          Matching is best effort. Amazon reimburses many lost items and unreturned refunds
          automatically, sometimes under a different SKU, a few days later, or in a report you did
          not upload, so a line here is something to check, not money you are owed. Amazon may also
          decline a claim, and may reverse a reimbursement if the item is found later.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Lost: adjustment reason codes {code("lost")} (inventory misplaced). Damaged: codes{" "}
            {code("damaged")} (damaged at an Amazon fulfilment centre). Found: codes {code("found")}
            . Other codes, such as disposals (D) and disposition changes (P, Q), are not counted.
            Codes are from Amazon&rsquo;s{" "}
            <a href={CLAIM_SOURCES.ledger} target="_blank" rel="noopener" className="underline">
              Inventory Ledger report help page
            </a>
            .
          </li>
          <li>
            If the ledger has an Unreconciled Quantity column, we use Amazon&rsquo;s own figure. If
            not, we take off units found, or reimbursed without an order number, for the same FNSKU
            (or SKU) from a week before the loss onwards.
          </li>
          <li>
            A refund is flagged when the returns report has no return for that order and SKU, and
            the reimbursements report has no reimbursement for that order. Seller-fulfilled orders
            are left out.
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">Claim windows we use</h2>
        <p>
          Lost or damaged in the warehouse: within {WAREHOUSE_CLAIM_DAYS} days of the date Amazon
          reported it (
          <a href={CLAIM_SOURCES.warehouse} target="_blank" rel="noopener" className="underline">
            Amazon
          </a>
          ). Refunded but not returned: no sooner than {CUSTOMER_RETURN_WINDOW.opensAfterDays} days
          and no later than {CUSTOMER_RETURN_WINDOW.closesAfterDays} days after the refund (
          <a
            href={CLAIM_SOURCES.customerReturns}
            target="_blank"
            rel="noopener"
            className="underline"
          >
            Amazon
          </a>
          ). These are the United Kingdom rules as published by Amazon; check them on Seller Central
          before relying on them. For a single date, use the{" "}
          <Link href="/tools/claims-deadline" className="underline">
            claims deadline checker
          </Link>
          .
        </p>
      </section>

      <section className="mt-10 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">Raising a claim yourself</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            In Seller Central, open the Inventory Defect and Reimbursement portal and look at the
            Eligible for claim, In progress and Resolved tabs. If the item is already there, you may
            not need to do anything.
          </li>
          <li>
            For a lost or damaged unit, use the transaction or reference ID, FNSKU and quantity from
            the list. For a refund with no return, use the order ID.
          </li>
          <li>
            File the claim from the portal or from Get support in Seller Central, and have your
            purchase invoice ready: Amazon pays warehouse losses on what the stock cost you.
          </li>
          <li>
            Keep a note of the case ID. If you think a reimbursement is too low, you can dispute it
            within 60 days of it being paid.
          </li>
        </ol>
        <p>
          There is no guarantee a claim will be accepted. Amazon asks sellers not to send claims
          that are premature or not checked, so only raise the ones you have looked into. Our guide
          to{" "}
          <Link href="/guides/amazon-lost-and-damaged-stock-claims" className="underline">
            lost and damaged stock claims
          </Link>{" "}
          goes through it step by step.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">How to get your files</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload any of these, as .txt or .csv. Menu names change from time to time; if one has
          moved, search Seller Central help for the report name.
        </p>
        <dl className="mt-3 divide-y rounded-xl border text-sm">
          {reports.map(([k, v]) => (
            <div key={k} className="grid gap-1 p-3 sm:grid-cols-[240px_1fr]">
              <dt className="font-medium">{k}</dt>
              <dd className="text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
