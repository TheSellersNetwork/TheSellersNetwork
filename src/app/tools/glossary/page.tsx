import type { Metadata } from "next";
import { ToolHeader } from "@/components/tools/tool-header";
import { glossary } from "@/lib/glossary";

export const metadata: Metadata = {
  title: "Seller glossary",
  description: "FBA, BSR, VeRO, INR, SNAD, ROI and the rest of the shorthand UK resellers use, in plain words.",
  alternates: { canonical: "/tools/glossary" },
};

export default function GlossaryPage() {
  const terms = [...glossary].sort((a, b) => a.term.localeCompare(b.term, "en-GB", { sensitivity: "base" }));
  const letters = Array.from(new Set(terms.map((t) => t.term[0].toUpperCase())));
  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Seller glossary" intro="The shorthand you will see in the forums, in plain words. In posts and guides these terms have a dotted underline: hover or tap one to see what it means." />
      <nav aria-label="Letters" className="mb-6 flex flex-wrap gap-1">
        {letters.map((l) => (
          <a key={l} href={`#letter-${l}`} className="rounded border bg-card px-2 py-0.5 text-sm hover:border-brand/60">
            {l}
          </a>
        ))}
      </nav>
      <dl className="divide-y rounded-xl border bg-card">
        {terms.map((t, i) => {
          const first = i === 0 || terms[i - 1].term[0].toUpperCase() !== t.term[0].toUpperCase();
          return (
            <div key={t.term} id={first ? `letter-${t.term[0].toUpperCase()}` : undefined} className="scroll-mt-20 p-4">
              <dt className="flex flex-wrap items-baseline gap-2 font-semibold">
                {t.term}
                {t.aliases?.length ? <span className="text-xs font-normal text-muted-foreground">also {t.aliases.join(", ")}</span> : null}
                {t.platform ? <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-normal">{t.platform}</span> : null}
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">{t.definition}</dd>
            </div>
          );
        })}
      </dl>
    </main>
  );
}
