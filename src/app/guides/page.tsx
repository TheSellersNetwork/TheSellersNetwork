import type { Metadata } from "next";
import Link from "next/link";
import { getGuides, type GuideMeta } from "@/lib/content/guides";
import { urls } from "@/lib/forum/urls";
import { plural } from "@/lib/format";

export const metadata: Metadata = {
  title: "Guides",
  description: "Free guides for UK resellers, one per common problem, grouped by platform.",
  alternates: { canonical: urls.guides() },
};

/*
  Guides are grouped by the platform their forum categories belong to. A guide
  tagged with forums on several platforms appears under each. Guides that
  apply everywhere sit in their own group at the end.
*/
const groups: { id: string; name: string; colour: string; match: (slug: string) => boolean }[] = [
  { id: "amazon", name: "Amazon", colour: "amazon", match: (s) => s.startsWith("amazon") },
  { id: "ebay", name: "eBay", colour: "ebay", match: (s) => s.startsWith("ebay") },
  { id: "vinted", name: "Vinted", colour: "vinted", match: (s) => s === "vinted" },
  { id: "facebook", name: "Facebook Marketplace", colour: "facebook", match: (s) => s === "facebook-marketplace" },
  { id: "depop", name: "Depop", colour: "website", match: (s) => s === "depop-and-clothing-resale" },
  { id: "live", name: "Live selling", colour: "live", match: (s) => ["live-selling", "whatnot", "ebay-live", "tiktok-live-and-other", "running-a-show"].includes(s) },
  { id: "other", name: "TikTok Shop, Etsy and your own site", colour: "website", match: (s) => ["tiktok-shop", "etsy-and-handmade", "own-website-and-shopify", "other-platforms"].includes(s) },
  { id: "general", name: "Every platform", colour: "general", match: (s) => ["sourcing-and-stock", "tax-bookkeeping-and-legal", "tools-and-automation", "multi-channel-selling", "wins-and-case-studies", "reselling"].includes(s) },
];

export default async function GuidesPage() {
  const guides = await getGuides();
  const sections = groups
    .map((g) => ({ ...g, guides: guides.filter((guide) => guide.categories.some(g.match)) }))
    .filter((g) => g.guides.length > 0);
  const unplaced = guides.filter((guide) => !groups.some((g) => guide.categories.some(g.match)));
  if (unplaced.length > 0) sections.push({ id: "more", name: "More", colour: "general", match: () => true, guides: unplaced });

  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Guides</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">One guide per common problem. Short, practical, free. Pick your platform.</p>

      {sections.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Guides are being written. The forums are open in the meantime.</p>
      ) : (
        <>
          <nav aria-label="Platforms" className="mt-6 flex flex-wrap gap-2">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm hover:border-brand/60">
                <span className="h-3 w-1 rounded-full" style={{ background: `var(--cat-${s.colour})` }} aria-hidden="true" />
                {s.name}
                <span className="text-muted-foreground">{s.guides.length}</span>
              </a>
            ))}
          </nav>

          {sections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`guides-${s.id}`} className="mt-10 scroll-mt-20">
              <h2 id={`guides-${s.id}`} className="flex items-center gap-3 text-xl font-semibold tracking-tight">
                <span className="h-6 w-1 rounded-full" style={{ background: `var(--cat-${s.colour})` }} aria-hidden="true" />
                {s.name}
                <span className="text-sm font-normal text-muted-foreground">{plural(s.guides.length, "guide")}</span>
              </h2>
              <ol className="mt-3 grid gap-3 sm:grid-cols-2">
                {s.guides.map((g) => (
                  <GuideCard key={g.slug} guide={g} />
                ))}
              </ol>
            </section>
          ))}
        </>
      )}
    </main>
  );
}

function GuideCard({ guide }: { guide: GuideMeta }) {
  return (
    <li className="forum-card row-enter rounded-xl border bg-card p-4">
      <Link href={urls.guide(guide.slug)} className="font-semibold leading-snug hover:underline">
        {guide.title}
      </Link>
      <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{guide.excerpt}</p>
    </li>
  );
}
