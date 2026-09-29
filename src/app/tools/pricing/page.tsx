import type { Metadata } from "next";
import Link from "next/link";
import { RepricerFloors } from "@/components/tools/repricer-floors";
import { BulkPrice, IsbnLookup, StockAgeing } from "@/components/tools/small-tools";
import { SoldComps } from "@/components/tools/sold-comps";
import { ToolHeader, ToolIntro } from "@/components/tools/tool-header";
import { ToolTabs } from "@/components/tools/tool-tabs";
import { WorthHelper } from "@/components/tools/worth-helper";

export const metadata: Metadata = {
  title: "Pricing tools: what it is worth, sold prices, markdowns, bulk changes and Amazon floors",
  description:
    "Find what an item is worth with ready-made sold price searches, summarise the sold prices you found, plan when to drop the price on stale stock, change prices across a listings file, set Amazon repricer minimum and maximum prices, and look up a book by ISBN. Free, and your files never leave your browser.",
  alternates: { canonical: "/tools/pricing" },
};

const soldHow = [
  ["eBay", "Search for the item, then turn on the Sold items filter (under Filter in the app, or in the left-hand column on a computer). Copy the prices, or the whole results text, and paste it here."],
  ["Vinted, Depop and others", "Note the prices of sold items you find that match yours, one per line."],
  ["Anywhere", "Your own past sales, auction results or a price guide: any list with pound amounts works."],
];

const floorsHow = [
  ["Your SKUs and current prices", "Seller Central, then Inventory, then Inventory Reports: an active listings report has your SKUs and prices. Add a cost column yourself."],
  ["FBA fees", "Amazon's revenue calculator, or the FBA fee preview report under Reports, then Fulfilment, shows the fulfilment fee for each product."],
  ["Uploading minimums and maximums", "Seller Central, then Pricing, then Automate Pricing: open a rule and choose to manage SKUs by file upload. Download Amazon's template there and paste in the columns from this tool."],
];

export default async function Page({ searchParams }: PageProps<"/tools/pricing">) {
  const { tab } = await searchParams;
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Pricing" intro="What something is worth, what to list at, when to bring the price down, how to change a whole file of prices at once, and the lowest price an Amazon repricer should go to." />
      <ToolTabs
        initial={typeof tab === "string" ? tab : undefined}
        label="Pricing tools"
        tabs={[
          {
            id: "comps",
            label: "What to list at",
            content: (
              <>
                <ToolIntro>
                  Paste the sold prices you have found yourself and see the typical price, the middle range and the extremes on one line. Leave out odd sales with a tap, then see what you would keep at those prices after fees. This tool does not look anything up: it only reads what you paste, in your browser.
                </ToolIntro>
                <SoldComps />
                <section className="mt-12 space-y-3">
                  <h2 className="text-lg font-semibold">Where to find sold prices</h2>
                  <p className="text-sm text-muted-foreground">Menu names change from time to time; if a filter has moved, search the platform&rsquo;s help for &ldquo;sold items&rdquo;. Only compare items that match yours in model, size and condition.</p>
                  <dl className="divide-y rounded-xl border text-sm">
                    {soldHow.map(([k, v]) => (
                      <div key={k} className="grid gap-1 p-3 sm:grid-cols-[180px_1fr]">
                        <dt className="font-medium">{k}</dt>
                        <dd className="text-muted-foreground">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <h2 className="pt-4 text-lg font-semibold">How prices are read</h2>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Any amount with a £ sign or GBP, like £12, £1,234.56 or GBP 20.</li>
                    <li>A number with pence, like 12.50, or a line with just a number on it.</li>
                    <li>A range such as &ldquo;£10 to £15&rdquo; or &ldquo;£10-15&rdquo; counts as two prices.</li>
                    <li>
                      Postage is left out: an amount with a + in front (eBay shows postage as &ldquo;+£3.20 postage&rdquo;), an amount right next to the words postage, P&amp;P, delivery or shipping, or the only amount on a line that mentions them.
                    </li>
                    <li>Whole numbers in the middle of text, like &ldquo;size 10&rdquo; or &ldquo;3 bids&rdquo;, are ignored because they are rarely prices.</li>
                  </ul>
                </section>
              </>
            ),
          },
          {
            id: "worth",
            label: "What's it worth?",
            content: (
              <>
                <ToolIntro>
                  Type the brand and item and get ready-made searches for eBay sold listings, Vinted, Depop and Facebook Marketplace, plus price guides for records, Lego, games and collectables. We only build the links; you open them and read the prices yourself.
                </ToolIntro>
                <WorthHelper />
              </>
            ),
          },
          {
            id: "markdowns",
            label: "When to drop the price",
            content: (
              <>
                <ToolIntro>How long has it been listed, what is the lowest you can go without losing money, and when should the price come down? Enter the numbers for one item.</ToolIntro>
                <StockAgeing />
              </>
            ),
          },
          {
            id: "bulk",
            label: "Change prices in bulk",
            content: (
              <>
                <ToolIntro>Download your listings file from your selling account, choose how to change the prices, check the preview, and download a new file to upload back. Your file never leaves your browser.</ToolIntro>
                <BulkPrice />
              </>
            ),
          },
          {
            id: "amazon-floors",
            label: "Amazon floor prices",
            content: (
              <>
                <ToolIntro>
                  A repricer should never take a SKU below the price where you stop making money. Give each SKU its cost and choose a rule, a least profit per unit or a least return on cost, and this works out the lowest price that meets it after Amazon&rsquo;s fees, plus a maximum. Download the result
                  for Amazon&rsquo;s Automate Pricing. Your file is read in your browser and never uploaded.
                </ToolIntro>
                <RepricerFloors />
                <section className="mt-12">
                  <h2 className="text-lg font-semibold">How to get your file</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Menu names change from time to time; if one has moved, search Seller Central help for &ldquo;Automate Pricing&rdquo; or &ldquo;inventory report&rdquo;.</p>
                  <dl className="mt-3 divide-y rounded-xl border text-sm">
                    {floorsHow.map(([k, v]) => (
                      <div key={k} className="grid gap-1 p-3 sm:grid-cols-[200px_1fr]">
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
            id: "books",
            label: "Books",
            content: (
              <>
                <ToolIntro>
                  Type or paste an ISBN to check it is valid and see the title, author and edition, so your listing matches the right book. Selling books on Amazon? See our{" "}
                  <Link href="/guides/amazon-used-books" className="underline">
                    used books guide
                  </Link>
                  .
                </ToolIntro>
                <IsbnLookup />
              </>
            ),
          },
        ]}
      />
    </main>
  );
}
