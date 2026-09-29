import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ReportingCheck, VatTools } from "@/components/tools/small-tools";
import { TaxDates } from "@/components/tools/tax-dates";
import { ToolHeader, ToolIntro } from "@/components/tools/tool-header";
import { ToolTabs } from "@/components/tools/tool-tabs";
import { TAX_CHECKED, taxLinks, thresholds } from "@/lib/tools/tax";

export const metadata: Metadata = {
  title: "Tax and HMRC tools for UK sellers",
  description:
    "Self Assessment deadlines and thresholds from GOV.UK, a check on whether your platforms will report you to HMRC, and VAT calculators for the threshold, the margin scheme and Flat Rate.",
  alternates: { canonical: "/tools/tax" },
};

export default async function Page({ searchParams }: PageProps<"/tools/tax">) {
  const { tab } = await searchParams;
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Tax and HMRC" intro="The dates and numbers UK online sellers get asked about most, whether a platform will report you, and the VAT sums for growing sellers. Not tax advice: if your situation is unusual, speak to an accountant." />
      <ToolTabs
        initial={typeof tab === "string" ? tab : undefined}
        label="Tax tools"
        tabs={[
          {
            id: "dates",
            label: "Tax dates",
            content: (
              <>
                <ToolIntro>Deadlines and thresholds, each linked to the GOV.UK page that states it.</ToolIntro>
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <TaxDates count={8} />

                  <section aria-labelledby="thresholds-heading">
                    <h2 id="thresholds-heading" className="font-semibold">
                      The numbers that matter
                    </h2>
                    <ul className="mt-3 space-y-3">
                      {thresholds.map((t) => (
                        <li key={t.label} className="rounded-lg border bg-card p-3">
                          <p className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-medium">{t.label}</span>
                            <span className="font-semibold text-brand">{t.value}</span>
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">{t.detail}</p>
                          <a href={t.url} target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 text-xs underline">
                            GOV.UK <ExternalLink className="size-3" aria-hidden="true" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                <section className="prose prose-neutral mt-10 max-w-none dark:prose-invert prose-a:text-brand" data-glossary>
                  <h2>Hobby or trading?</h2>
                  <p>
                    Selling your own unwanted things now and then is not trading, and there is usually no tax to pay. Buying things in order to sell them for a profit, such as regular car boot or charity shop flips, is trading, and once that income is over the trading allowance you need to tell HMRC. HMRC judges it on the facts, using what it calls the{" "}
                    <a href={taxLinks.badgesOfTrade}>badges of trade</a>. HMRC&rsquo;s own plain summary is on its <a href={taxLinks.hustles}>Tax Help for Hustles</a> page.
                  </p>
                  <h2>Being reported is not the same as owing tax</h2>
                  <p>
                    Since January 2024, sites like eBay, Vinted, Etsy and Depop collect sellers&rsquo; details and report anyone with 30 or more sales, or about £1,700 or more, in a calendar year. The first reports went to HMRC by 31 January 2025. HMRC has said this is{" "}
                    <a href={taxLinks.noNewTax}>not a new tax</a>, and a report does not by itself mean you owe anything. Platform figures run January to December, while the tax year runs 6 April to 5 April, so{" "}
                    <a href={taxLinks.platformIncome}>convert them to the tax year</a> before you use them on a return.
                  </p>
                  <p>
                    The full walk-through, with record keeping, expenses and what to do if you have never filed:{" "}
                    <Link href="/guides/bookkeeping-and-tax-for-resellers">Bookkeeping and tax for UK resellers</Link>. Questions go in{" "}
                    <Link href="/community/c/tax-bookkeeping-and-legal">Tax, bookkeeping and legal</Link>.
                  </p>
                </section>
                <p className="mt-6 text-xs text-muted-foreground">Checked against GOV.UK on {TAX_CHECKED}. Rates and thresholds change at Budgets; check the linked page before relying on a figure.</p>
              </>
            ),
          },
          {
            id: "reporting",
            label: "Will I be reported?",
            content: (
              <>
                <ToolIntro>Selling sites now send HMRC details of sellers who pass a limit each calendar year. Enter your numbers for each platform to see where you stand.</ToolIntro>
                <ReportingCheck />
              </>
            ),
          },
          {
            id: "vat",
            label: "VAT",
            content: (
              <>
                <ToolIntro>Three sums growing sellers ask about: how close you are to the VAT threshold, VAT on a second-hand item under the margin scheme, and Flat Rate against standard VAT. Not tax advice.</ToolIntro>
                <VatTools />
              </>
            ),
          },
        ]}
      />
    </main>
  );
}
