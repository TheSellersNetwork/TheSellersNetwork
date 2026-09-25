import type { Metadata } from "next";
import Link from "next/link";
import { getGuides } from "@/lib/content/guides";
import { urls } from "@/lib/forum/urls";

export const metadata: Metadata = {
  title: "Guides",
  description: "Free guides, one per common seller problem.",
  alternates: { canonical: urls.guides() },
};

export default async function GuidesPage() {
  const guides = await getGuides();
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Guides</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">[TOM: guides standfirst]</p>
      {guides.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">[TOM: guides are on their way]</p>
      ) : (
        <ol className="mt-8 divide-y rounded-lg border bg-card">
          {guides.map((g) => (
            <li key={g.slug} className="p-4">
              <Link href={urls.guide(g.slug)} className="font-semibold hover:underline">
                {g.title}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">{g.excerpt}</p>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
