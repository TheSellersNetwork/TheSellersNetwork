import { readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import { Mdx } from "@/components/content/mdx";

/* Legal and policy pages written as MDX in content/legal. */
export async function loadLegal(slug: string) {
  try {
    const { data, content } = matter(await readFile(path.join(process.cwd(), "content", "legal", `${slug}.mdx`), "utf8"));
    const updated = data.updated instanceof Date ? data.updated.toISOString().slice(0, 10) : String(data.updated ?? "");
    return { title: String(data.title), description: String(data.description ?? ""), updated, content };
  } catch {
    return null;
  }
}

export async function LegalPage({ slug }: { slug: string }) {
  const doc = await loadLegal(slug);
  if (!doc) notFound();
  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{doc.title}</h1>
      {doc.updated ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Last updated {new Date(`${doc.updated}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
        </p>
      ) : null}
      <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert prose-a:text-brand prose-table:text-sm">
        <Mdx source={doc.content} />
      </div>
    </main>
  );
}
