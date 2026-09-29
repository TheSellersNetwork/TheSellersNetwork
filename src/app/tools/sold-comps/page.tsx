import type { Metadata } from "next";
import { SoldComps } from "@/components/tools/sold-comps";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Sold prices summariser",
  description: "Paste the sold prices you found on eBay, Vinted or anywhere else and see the median, quartiles and range, then what you would keep after fees. Free, and nothing leaves your browser.",
  alternates: { canonical: "/tools/sold-comps" },
};

const how = [
  ["eBay", "Search for the item, then turn on the Sold items filter (under Filter in the app, or in the left-hand column on a computer). Copy the prices, or the whole results text, and paste it here."],
  ["Vinted, Depop and others", "Note the prices of sold items you find that match yours, one per line."],
  ["Anywhere", "Your own past sales, auction results or a price guide: any list with pound amounts works."],
];

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader
        title="Sold prices summariser"
        intro="Paste the sold prices you have found yourself and see the typical price, the middle range and the extremes on one line. Leave out odd sales with a tap, then see what you would keep at those prices after fees. This tool does not look anything up: it only reads what you paste, in your browser."
      />
      <SoldComps />
      <section className="mt-12 space-y-3">
        <h2 className="text-lg font-semibold">Where to find sold prices</h2>
        <p className="text-sm text-muted-foreground">Menu names change from time to time; if a filter has moved, search the platform&rsquo;s help for &ldquo;sold items&rdquo;. Only compare items that match yours in model, size and condition.</p>
        <dl className="divide-y rounded-xl border text-sm">
          {how.map(([k, v]) => (
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
          <li>Postage is left out: an amount with a + in front (eBay shows postage as &ldquo;+£3.20 postage&rdquo;), an amount right next to the words postage, P&amp;P, delivery or shipping, or the only amount on a line that mentions them.</li>
          <li>Whole numbers in the middle of text, like &ldquo;size 10&rdquo; or &ldquo;3 bids&rdquo;, are ignored because they are rarely prices.</li>
        </ul>
      </section>
    </main>
  );
}
