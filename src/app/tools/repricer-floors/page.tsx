import type { Metadata } from "next";
import { RepricerFloors } from "@/components/tools/repricer-floors";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Amazon repricer minimum and maximum prices",
  description: "Work out a minimum and maximum price for every Amazon SKU from your costs and Amazon's fees, then download a file for Automate Pricing. FBA and FBM. Free, and nothing leaves your browser.",
  alternates: { canonical: "/tools/repricer-floors" },
};

const how = [
  ["Your SKUs and current prices", "Seller Central, then Inventory, then Inventory Reports: an active listings report has your SKUs and prices. Add a cost column yourself."],
  ["FBA fees", "Amazon's revenue calculator, or the FBA fee preview report under Reports, then Fulfilment, shows the fulfilment fee for each product."],
  ["Uploading minimums and maximums", "Seller Central, then Pricing, then Automate Pricing: open a rule and choose to manage SKUs by file upload. Download Amazon's template there and paste in the columns from this tool."],
];

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader
        title="Amazon repricer minimum and maximum prices"
        intro="A repricer should never take a SKU below the price where you stop making money. Give each SKU its cost and choose a rule, a least profit per unit or a least return on cost, and this works out the lowest price that meets it after Amazon's fees, plus a maximum. Download the result for Amazon's Automate Pricing. Your file is read in your browser and never uploaded."
      />
      <RepricerFloors />
      <section className="mt-12">
        <h2 className="text-lg font-semibold">How to get your file</h2>
        <p className="mt-1 text-sm text-muted-foreground">Menu names change from time to time; if one has moved, search Seller Central help for &ldquo;Automate Pricing&rdquo; or &ldquo;inventory report&rdquo;.</p>
        <dl className="mt-3 divide-y rounded-xl border text-sm">
          {how.map(([k, v]) => (
            <div key={k} className="grid gap-1 p-3 sm:grid-cols-[200px_1fr]">
              <dt className="font-medium">{k}</dt>
              <dd className="text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
