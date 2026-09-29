import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EbayShop, FbaCalculator, OfferCalculator, PlatformCalculator, ShowPlanner, WhereToSell } from "@/components/tools/fee-tools";
import { ToolHeader, ToolIntro, ToolSection } from "@/components/tools/tool-header";
import { calculatorSlugs, type CalculatorSlug } from "@/lib/tools/catalogue";
import { parseShared, sharedQuery } from "@/lib/og/calculator-share";
import type { PlatformId } from "@/lib/tools/fees";
import { cn } from "@/lib/utils";

/*
  The fee and profit calculator. /tools/calculator compares every platform;
  /tools/calculator/<platform> is one platform in detail. Each view has its own
  address, title and description so "eBay fee calculator" and the rest still
  have a page of their own in search results.
*/

type View = { switcher: string; name: string; intro: string; description?: string; id?: PlatformId; fba?: boolean; ebayShop?: boolean; showPlanner?: boolean };

const HUB = "Fee and profit calculator";

const views: Record<CalculatorSlug, View> = {
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

const describe = (v: View) => v.description || `${v.intro} Free, UK fees checked against the official page.`;

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ platform: [] as string[] }, ...calculatorSlugs.map((slug) => ({ platform: [slug] }))];
}

function resolve(platform: string[] | undefined): { slug: string | null; view: View | null } | null {
  if (!platform || platform.length === 0) return { slug: null, view: null };
  if (platform.length > 1) return null;
  const slug = calculatorSlugs.find((s) => s === platform[0]);
  return slug ? { slug, view: views[slug] } : null;
}

/*
  The share card comes from /api/og/calculator, which can read the inputs a
  shared link carries (?price=20&cost=5) and show that result.
*/
function shareCard(slug: string | null, sp: Record<string, string | string[] | undefined>, alt: string): Pick<Metadata, "openGraph" | "twitter"> {
  const shared = parseShared(sp);
  const query = [slug ? `platform=${slug}` : "", shared ? sharedQuery(shared) : ""].filter(Boolean).join("&");
  const images = [{ url: `/api/og/calculator${query ? `?${query}` : ""}`, width: 1200, height: 630, alt }];
  return { openGraph: { title: alt, images }, twitter: { card: "summary_large_image", images } };
}

export async function generateMetadata({ params, searchParams }: PageProps<"/tools/calculator/[[...platform]]">): Promise<Metadata> {
  const r = resolve((await params).platform);
  if (!r) return {};
  const sp = await searchParams;
  if (!r.view || !r.slug) {
    return {
      title: "Fee and profit calculator for UK sellers",
      description: "Compare what you keep after fees on eBay, Vinted, Depop, Etsy, Amazon, TikTok Shop, Whatnot and eBay Live for the same item, then open any platform for the full breakdown. Free, no sign-up.",
      alternates: { canonical: "/tools/calculator" },
      ...shareCard(null, sp, "Fee and profit calculator for UK sellers"),
    };
  }
  return { title: r.view.name, description: describe(r.view), alternates: { canonical: `/tools/calculator/${r.slug}` }, ...shareCard(r.slug, sp, r.view.name) };
}

function Switcher({ current }: { current: string | null }) {
  const links = [{ slug: null as string | null, label: "Compare all" }, ...calculatorSlugs.map((slug) => ({ slug, label: views[slug].switcher }))];
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

const offer = (
  <ToolSection id="lowest-offer" title="Lowest offer you can accept" intro="Work out the lowest offer you can accept and still make the profit you want, and see what each level of discount leaves you with.">
    <OfferCalculator />
  </ToolSection>
);

export default async function Page({ params, searchParams }: PageProps<"/tools/calculator/[[...platform]]">) {
  const r = resolve((await params).platform);
  if (!r) notFound();
  const { slug, view } = r;
  // A shared result link (?price=20&cost=5) opens with those figures filled in.
  const shared = parseShared(await searchParams) ?? undefined;

  if (!view) {
    return (
      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <ToolHeader title={HUB} intro="What you keep after fees on every UK selling platform, the lowest offer you can take, and a detailed calculator for each platform. Pick a platform below, or compare them all at one price." />
        <Switcher current={null} />
        <section id="where-to-sell" aria-labelledby="where-to-sell-heading" className="scroll-mt-20">
          <h2 id="where-to-sell-heading" className="text-xl font-semibold tracking-tight">
            Where should I sell this?
          </h2>
          <ToolIntro>
            Enter one price and see what you would actually keep on eBay, Vinted, Depop, Etsy, TikTok Shop, Whatnot, eBay Live, Amazon and Facebook, side by side. Tap a platform for the breakdown.
          </ToolIntro>
          <WhereToSell shared={shared} />
        </section>
        {offer}
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title={view.name} intro={view.intro} parent={{ href: "/tools/calculator", label: HUB }} />
      <Switcher current={slug} />
      {view.fba ? <FbaCalculator /> : view.id ? <PlatformCalculator platform={view.id} shared={shared} /> : null}
      {offer}
      {view.ebayShop ? (
        <ToolSection id="ebay-shop" title="Is an eBay shop worth it?" intro="For private sellers: compare listing fees with and without an eBay shop for the number of listings you make each month.">
          <EbayShop />
        </ToolSection>
      ) : null}
      {view.showPlanner ? (
        <ToolSection id="show-planner" title="Live show planner" intro="List what you plan to sell in your next Whatnot, eBay Live or TikTok show and get the lowest safe starting bid for each item, covering fees, packaging and giveaways.">
          <ShowPlanner />
        </ToolSection>
      ) : null}
    </main>
  );
}
