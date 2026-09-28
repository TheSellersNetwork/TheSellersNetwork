import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformCalculator } from "@/components/tools/fee-tools";
import { ToolHeader } from "@/components/tools/tool-header";
import type { PlatformId } from "@/lib/tools/fees";

const pages: Record<string, { id: PlatformId; name: string; intro: string }> = {
  ebay: { id: "ebay_business", name: "eBay fee calculator", intro: "Fees and profit for UK business sellers on eBay: final value fee by category, the per-order fee, the regulatory fee and Promoted Listings. Private sellers selling their own things pay no selling fee." },
  vinted: { id: "vinted", name: "Vinted fee calculator", intro: "What you keep on Vinted, and what the buyer pays with the Buyer Protection fee and postage." },
  depop: { id: "depop", name: "Depop fee calculator", intro: "Depop payment processing and Boosted listing fees, and your profit." },
  etsy: { id: "etsy", name: "Etsy fee calculator", intro: "Every Etsy fee on one sale: listing, transaction, payment processing, the regulatory fee and Offsite Ads." },
  "tiktok-shop": { id: "tiktok_shop", name: "TikTok Shop fee calculator", intro: "TikTok Shop UK commission on your sale, including postage the buyer pays." },
  whatnot: { id: "whatnot", name: "Whatnot fee calculator", intro: "Whatnot UK commission and payment processing on one sale, with VAT on fees." },
  "ebay-live": { id: "ebay_live", name: "eBay Live fee calculator", intro: "eBay Live commission (capped per item) and payment processing on one sale." },
  amazon: { id: "amazon_fbm", name: "Amazon fee calculator (you post it)", intro: "Amazon referral fees by category when you post orders yourself. For Fulfilled by Amazon, use the FBA calculator." },
};

export function generateStaticParams() {
  return Object.keys(pages).map((platform) => ({ platform }));
}

export async function generateMetadata({ params }: PageProps<"/tools/fees/[platform]">): Promise<Metadata> {
  const { platform } = await params;
  const p = pages[platform];
  if (!p) return {};
  return { title: p.name, description: `${p.intro} Free, UK fees checked against the official page.`, alternates: { canonical: `/tools/fees/${platform}` } };
}

export default async function Page({ params }: PageProps<"/tools/fees/[platform]">) {
  const { platform } = await params;
  const p = pages[platform];
  if (!p) notFound();
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title={p.name} intro={p.intro} />
      <PlatformCalculator platform={p.id} />
    </main>
  );
}
