import type { Metadata } from "next";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { getPartners, partnerCategories, relationshipLabels } from "@/lib/partners/queries";

export const metadata: Metadata = {
  title: "Partners",
  description: "Tools and services The Sellers Network works with. Sponsored and affiliate relationships are always labelled.",
  alternates: { canonical: "/partners" },
};

/*
  The partners directory. Every entry is Tom's copy. Paid relationships carry
  a visible label and the link is marked rel="sponsored" for search engines.
*/
export default async function PartnersPage() {
  const partners = await getPartners();
  const groups = partnerCategories.map((c) => ({ ...c, partners: partners.filter((p) => p.category === c.id) })).filter((g) => g.partners.length > 0);

  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Partners</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">[TOM: how partners are chosen, and that sponsored and affiliate relationships are always labelled]</p>
      {groups.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">[TOM: partners are on their way]</p>
      ) : (
        groups.map((group) => (
          <section key={group.id} aria-labelledby={`partners-${group.id}`} className="mt-10">
            <h2 id={`partners-${group.id}`} className="text-lg font-semibold">
              {group.label}
            </h2>
            <ul className="mt-3 grid gap-4 sm:grid-cols-2">
              {group.partners.map((p) => {
                const label = relationshipLabels[p.relationship];
                return (
                  <li key={p.id} className="flex gap-4 rounded-lg border bg-card p-4">
                    <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-md border bg-background">
                      {p.logo_url ? (
                        <Image src={p.logo_url} alt="" width={56} height={56} className="size-full object-contain p-1" />
                      ) : (
                        <span className="text-lg font-semibold text-muted-foreground">{p.name.slice(0, 1)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`/go/partner/${p.slug}`}
                          rel={p.relationship === "partner" ? "noopener" : "sponsored noopener"}
                          className="font-semibold hover:underline"
                        >
                          {p.name}
                          <ExternalLink className="ml-1 inline size-3.5 align-[-2px] text-muted-foreground" aria-hidden="true" />
                        </a>
                        {label ? <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">{label}</span> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{p.blurb ?? `[TOM: one paragraph on ${p.name}]`}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
      <p className="mt-12 text-sm text-muted-foreground">
        Want to be listed? [TOM: how to get in touch about partnerships]
      </p>
    </main>
  );
}
