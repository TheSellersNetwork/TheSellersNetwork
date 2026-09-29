import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EbayShop, FbaCalculator, OfferCalculator, PlatformCalculator, ShowPlanner, WhereToSell } from "@/components/tools/fee-tools";
import { ToolHeader, ToolIntro, ToolSection } from "@/components/tools/tool-header";
import { calculatorSlugs } from "@/lib/tools/catalogue";
import { parseShared, sharedQuery } from "@/lib/og/calculator-share";
import { readExtras, readFba } from "@/components/tools/calculator/model";
import { CalculatorSwitcher as Switcher, HUB, views, type View } from "@/components/tools/calculator/views";
import { savingState } from "@/app/account/calculations/data";

/*
  The fee and profit calculator. /tools/calculator compares every platform;
  /tools/calculator/<platform> is one platform in detail. Each view has its own
  address, title and description so "eBay fee calculator" and the rest still
  have a page of their own in search results.
*/

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

function EmbedNote() {
  return (
    <p className="mt-12 border-t pt-4 text-sm text-muted-foreground">
      Run a blog or a group for sellers?{" "}
      <Link href="/tools/calculator/embed" className="underline">
        Put this calculator on your own site
      </Link>
      .
    </p>
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
  const sp = await searchParams;
  const shared = parseShared(sp) ?? undefined;
  const saving = await savingState();

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
          <WhereToSell shared={shared} saving={saving} />
        </section>
        {offer}
        <EmbedNote />
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title={view.name} intro={view.intro} parent={{ href: "/tools/calculator", label: HUB }} />
      <Switcher current={slug} />
      {view.fba ? (
        <FbaCalculator initial={readFba(sp) ?? undefined} saving={saving} />
      ) : view.id ? (
        <PlatformCalculator platform={view.id} shared={shared} extras={readExtras(sp)} saving={saving} />
      ) : null}
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
      <EmbedNote />
    </main>
  );
}
