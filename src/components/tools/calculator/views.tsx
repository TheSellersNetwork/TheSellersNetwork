import Link from "next/link";
import { calculatorSlugs, type CalculatorSlug } from "@/lib/tools/catalogue";
import type { PlatformId } from "@/lib/tools/fees";
import { cn } from "@/lib/utils";

/* Each calculator page's name, intro and fee engine id, and the tabs that move between them. */

export type View = { switcher: string; name: string; intro: string; description?: string; id?: PlatformId; fba?: boolean; ebayShop?: boolean; showPlanner?: boolean };

export const HUB = "Fee and profit calculator";

export const views: Record<CalculatorSlug, View> = {
  ebay: { switcher: "eBay", id: "ebay_business", ebayShop: true, name: "eBay fee calculator", intro: "Fees and profit for UK business sellers on eBay: final value fee by category, the per-order fee, the regulatory fee and Promoted Listings. Private sellers selling their own things pay no selling fee." },
  vinted: { switcher: "Vinted", id: "vinted", name: "Vinted fee calculator", intro: "What you keep on Vinted, and what the buyer pays with the Buyer Protection fee and postage." },
  depop: { switcher: "Depop", id: "depop", name: "Depop fee calculator", intro: "Depop payment processing and Boosted listing fees, and your profit." },
  etsy: { switcher: "Etsy", id: "etsy", name: "Etsy fee calculator", intro: "Every Etsy fee on one sale: listing, transaction, payment processing, the regulatory fee and Offsite Ads." },
  amazon: { switcher: "Amazon: you post it", id: "amazon_fbm", name: "Amazon fee calculator (you post it)", intro: "Amazon referral fees by category when you post orders yourself. For Fulfilled by Amazon, choose Amazon FBA above." },
  "amazon-fba": {
    switcher: "Amazon FBA",
    fba: true,
    name: "Amazon FBA profit calculator",
    intro: "Referral fee, fulfilment fee, the fuel surcharge, storage and VAT on fees, with your profit, ROI and the most you can pay to hit your target.",
    description: "Amazon FBA UK fees, profit, ROI and maximum buy price in one place. Free.",
  },
  "tiktok-shop": { switcher: "TikTok Shop", id: "tiktok_shop", name: "TikTok Shop fee calculator", intro: "TikTok Shop UK commission on your sale, including postage the buyer pays." },
  whatnot: { switcher: "Whatnot", id: "whatnot", showPlanner: true, name: "Whatnot fee calculator", intro: "Whatnot UK commission and payment processing on one sale, with VAT on fees." },
  "ebay-live": { switcher: "eBay Live", id: "ebay_live", showPlanner: true, name: "eBay Live fee calculator", intro: "eBay Live commission (capped per item) and payment processing on one sale." },
};

export function CalculatorSwitcher({ current }: { current: string | null }) {
  const links = [
    { slug: null as string | null, label: "Compare all" },
    ...calculatorSlugs.map((slug) => ({ slug, label: views[slug].switcher })),
    { slug: "compare", label: "Two items side by side" },
  ];
  return (
    <nav aria-label="Platforms" className="mb-8 flex gap-1 overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {links.map((l) => {
        const here = l.slug === current;
        return (
          <Link
            key={l.label}
            href={l.slug ? `/tools/calculator/${l.slug}` : "/tools/calculator"}
            aria-current={here ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 pb-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              here ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

