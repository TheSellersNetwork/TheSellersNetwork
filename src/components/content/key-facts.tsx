import { Mdx } from "@/components/content/mdx";

/*
  "Key facts" in the right column on desktop, from the article's own
  "The short version" bullets. Hidden below lg, where the bullets are already
  near the top of the article.
*/
export function KeyFacts({ bullets }: { bullets: string[] }) {
  if (bullets.length === 0) return null;
  return (
    <section aria-labelledby="key-facts-heading" className="hidden rounded-lg border bg-card p-4 lg:block" data-testid="key-facts">
      <h2 id="key-facts-heading" className="text-sm font-semibold">
        Key facts
      </h2>
      <div className="prose prose-sm prose-neutral mt-2 max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-0 prose-ul:pl-4 prose-li:my-1.5 prose-li:pl-0 prose-a:text-brand">
        <Mdx source={bullets.map((b) => `- ${b}`).join("\n")} />
      </div>
    </section>
  );
}
