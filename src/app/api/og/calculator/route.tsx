import { shareImage } from "@/lib/og/card";
import { calculatorPages, compareExample, isCalculatorSlug, parseShared, platformExample } from "@/lib/og/calculator-share";
import { ukLongDate } from "@/lib/og/labels";
import { feeData } from "@/lib/tools/fees";

/*
  Share card for the fee calculator. The file-convention opengraph-image route
  cannot see the query string, so the calculator pages point their og:image
  here with the shared inputs: /api/og/calculator?platform=ebay&price=20.
  With a price, the card shows the result worked out by the same fee engine
  as the page; without one, just the calculator's name.
*/
export function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const slug = q.get("platform");
  const inputs = parseShared(q);
  const checked = ukLongDate(feeData.checked);
  const meta = [checked ? `Fees checked ${checked}` : null, "Not financial advice"];
  const headers = { "cache-control": "public, max-age=3600, s-maxage=86400" };

  if (isCalculatorSlug(slug)) {
    const page = calculatorPages[slug];
    const example = inputs ? platformExample(slug, inputs) : null;
    if (!example) return shareImage({ label: "Free tool", title: page.title, meta: ["No sign-up"] }, { headers });
    return shareImage(
      {
        label: page.title.replace(/ \(.*\)$/, ""),
        title: example.headline,
        stats: [
          { label: "Fees", value: example.fees },
          { label: "You receive", value: example.receive, highlight: !example.showProfit },
          ...(example.showProfit ? [{ label: "Profit", value: example.profit, highlight: true }] : []),
        ],
        meta,
      },
      { headers },
    );
  }

  if (!inputs) return shareImage({ label: "Free tool", title: "Fee and profit calculator for UK sellers", meta: ["No sign-up"] }, { headers });
  const compare = compareExample(inputs);
  const showProfit = inputs.cost > 0 || inputs.postageCost > 0;
  return shareImage(
    {
      label: "Fee calculator",
      title: compare.headline,
      rows: compare.rows.map((r) => ({ name: r.name, value: `keep ${r.receive}`, note: showProfit ? `profit ${r.profit}` : undefined })),
      meta,
    },
    { headers },
  );
}
